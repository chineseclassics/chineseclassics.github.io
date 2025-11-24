/**
 * 時文寶鑑 - DOCX 導出服務（學生端）
 * - 讀取作文、老師評分與批註
 * - 建立含 Word 批註的 DOCX
 * - 供前端觸發下載
 */

let docxLibPromise = null;

async function loadDocxLib() {
  if (!docxLibPromise) {
    docxLibPromise = import('https://esm.sh/docx@8.5.0?bundle');
  }
  return docxLibPromise;
}

/**
 * 匯出指定 essay 為 DOCX
 * @param {Object} options
 * @param {Object} options.supabase Supabase client
 * @param {string} options.essayId Essay 主鍵
 * @param {string} [options.studentName] 學生姓名
 * @param {string} [options.studentEmail] 學生 Email
 * @param {Object} [options.prefetchedGrade] 已查詢的老師評分
 */
export async function exportEssayAsDocx({ supabase, essayId, studentName, studentEmail, prefetchedGrade = null }) {
  if (!supabase) throw new Error('尚未初始化 Supabase 連線');
  if (!essayId) throw new Error('缺少文章 ID');

  const exportData = await fetchExportData({ supabase, essayId, prefetchedGrade });
  const docx = await loadDocxLib();
  const document = buildDocxDocument(docx, {
    studentName,
    studentEmail,
    ...exportData
  });
  const blob = await docx.Packer.toBlob(document);
  const filename = buildFilename({
    assignmentTitle: exportData.assignment?.title,
    essayTitle: exportData.essay?.title,
    studentName
  });
  triggerDownload(blob, filename);
}

async function fetchExportData({ supabase, essayId, prefetchedGrade }) {
  const { data: essay, error: essayError } = await supabase
    .from('essays')
    .select('id, title, content_json, assignment_id, student_id, submitted_at, created_at')
    .eq('id', essayId)
    .maybeSingle();
  if (essayError) throw essayError;
  if (!essay) throw new Error('找不到對應的文章記錄');

  const [assignment, student, grade] = await Promise.all([
    fetchAssignment(supabase, essay.assignment_id),
    fetchUserProfile(supabase, essay.student_id),
    prefetchedGrade ? Promise.resolve(prefetchedGrade) : fetchGrade(supabase, essayId)
  ]);

  if (!grade) throw new Error('目前還沒有老師評分，無法匯出 DOCX');

  const annotations = await fetchAnnotations(supabase, essayId);
  return {
    essay,
    assignment,
    student,
    grade,
    annotations
  };
}

async function fetchAssignment(supabase, assignmentId) {
  if (!assignmentId) return null;
  const { data, error } = await supabase
    .from('assignments')
    .select('id, title')
    .eq('id', assignmentId)
    .maybeSingle();
  if (error) {
    console.warn('⚠️ 讀取 assignment 失敗，忽略：', error.message);
    return null;
  }
  return data;
}

async function fetchUserProfile(supabase, userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('users')
    .select('id, display_name, email')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.warn('⚠️ 讀取 users 失敗，忽略：', error.message);
    return null;
  }
  return data;
}

async function fetchGrade(supabase, essayId) {
  const { data, error } = await supabase
    .from('grades')
    .select(`
      *,
      teacher:users!teacher_id(display_name, email)
    `)
    .eq('essay_id', essayId)
    .eq('status', 'final')
    .maybeSingle();
  if (error) {
    console.warn('⚠️ 讀取評分失敗：', error.message);
    return null;
  }
  return data;
}

async function fetchAnnotations(supabase, essayId) {
  const { data: anchorRows, error } = await supabase.rpc('get_essay_annotations_pm', { p_essay_id: essayId });
  if (error) {
    console.warn('⚠️ 讀取批註錨點失敗：', error.message);
    return [];
  }
  const anchors = Array.isArray(anchorRows) ? anchorRows : [];
  const ids = anchors.map(a => a.id).filter(Boolean);
  if (!ids.length) return [];

  const [
    { data: annotationRows, error: annotationsError },
    { data: commentRows, error: commentsError }
  ] = await Promise.all([
    supabase
      .from('annotations')
      .select('id, content, created_at, teacher_id, student_id')
      .in('id', ids),
    supabase
      .from('annotation_comments')
      .select('id, annotation_id, user_id, content, created_at')
      .in('annotation_id', ids)
  ]);
  if (annotationsError) console.warn('⚠️ 讀取 annotations 失敗：', annotationsError.message);
  if (commentsError) console.warn('⚠️ 讀取 annotation_comments 失敗：', commentsError.message);

  const userIds = new Set();
  annotationRows?.forEach(row => {
    if (row.teacher_id) userIds.add(row.teacher_id);
    if (row.student_id) userIds.add(row.student_id);
  });
  commentRows?.forEach(row => {
    if (row.user_id) userIds.add(row.user_id);
  });

  let userMap = new Map();
  if (userIds.size > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, display_name, email')
      .in('id', Array.from(userIds));
    userMap = new Map((users || []).map(u => [u.id, u]));
  }

  const annotationMap = new Map((annotationRows || []).map(row => [row.id, row]));
  const groupedReplies = new Map();
  (commentRows || []).forEach(comment => {
    if (!groupedReplies.has(comment.annotation_id)) {
      groupedReplies.set(comment.annotation_id, []);
    }
    groupedReplies.get(comment.annotation_id).push({
      ...comment,
      user: comment.user_id ? userMap.get(comment.user_id) : null
    });
  });

  return anchors.map(anchor => {
    const record = annotationMap.get(anchor.id) || {};
    const authorId = record.teacher_id || record.student_id || null;
    return {
      ...anchor,
      ...record,
      author: authorId ? userMap.get(authorId) : null,
      replies: groupedReplies.get(anchor.id) || []
    };
  });
}

function buildDocxDocument(docx, { essay, assignment, student, studentName, studentEmail, grade, annotations }) {
  const contentJSON = parseContentJSON(essay?.content_json);
  if (!contentJSON) throw new Error('文章內容缺失或格式錯誤，請重新保存後再導出');

  const structure = collectParagraphStructure(contentJSON);
  const { inlineAnnotations, orphanAnnotations } = resolveAnnotationAnchors(annotations, structure.paragraphs);

  const commentEntries = inlineAnnotations.map((ann, idx) => ({
    ...ann,
    docxId: idx,
    commentParagraphs: buildCommentParagraphs(docx, ann)
  }));

  const paragraphNodes = structure.paragraphs.map((paragraph, idx) => {
    const relatedAnnotations = commentEntries.filter(ann => ann.paragraphIndex === idx);
    return buildParagraphNode(docx, paragraph, relatedAnnotations);
  });

  const metaParagraphs = buildMetadataSection(docx, {
    essay,
    assignment,
    student,
    studentName,
    studentEmail,
    grade
  });

  const summaryParagraphs = buildSummarySection(docx, {
    grade,
    orphanAnnotations
  });

  const docOptions = {
    sections: [
      {
        properties: {},
        children: [
          ...metaParagraphs,
          ...paragraphNodes,
          ...summaryParagraphs
        ]
      }
    ]
  };

  if (commentEntries.length > 0) {
    docOptions.comments = new docx.Comments({
      children: commentEntries.map(entry => new docx.Comment({
        id: entry.docxId,
        author: entry.authorName || '老師',
        date: entry.created_at ? new Date(entry.created_at) : new Date(),
        children: entry.commentParagraphs
      }))
    });
  }

  return new docx.Document(docOptions);
}

function parseContentJSON(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error('❌ 解析 content_json 失敗:', err);
    return null;
  }
}

function collectParagraphStructure(doc) {
  const paragraphs = [];
  let globalOffset = 0;

  function visit(node) {
    if (!node) return;
    if (node.type === 'paragraph' || node.type === 'heading') {
      const para = {
        type: node.type,
        level: node.attrs?.level || (node.type === 'heading' ? 2 : null),
        runs: [],
        globalStart: globalOffset,
        globalEnd: globalOffset
      };
      if (Array.isArray(node.content)) {
        node.content.forEach(child => collectInline(child, para));
      }
      para.globalEnd = globalOffset;
      if (para.runs.length > 0) {
        paragraphs.push(para);
      }
      return;
    }
    if (Array.isArray(node.content)) {
      node.content.forEach(child => visit(child));
    }
  }

  function collectInline(node, paragraph) {
    if (!node) return;
    if (node.type === 'text') {
      appendRun(node.text || '', node.marks, paragraph);
      return;
    }
    if (node.type === 'hard_break') {
      appendRun('\n', null, paragraph);
      return;
    }
    if (Array.isArray(node.content)) {
      node.content.forEach(child => collectInline(child, paragraph));
    }
  }

  function appendRun(text, marks, paragraph) {
    if (!text) return;
    const runLength = text.length;
    const run = {
      text,
      marks: normalizeMarks(marks),
      relStart: globalOffset - paragraph.globalStart,
      relEnd: globalOffset - paragraph.globalStart + runLength,
      globalStart: globalOffset,
      globalEnd: globalOffset + runLength
    };
    paragraph.runs.push(run);
    globalOffset += runLength;
  }

  visit(doc);
  return { paragraphs, totalLength: globalOffset };
}

function normalizeMarks(marks = []) {
  if (!Array.isArray(marks)) return {};
  const flags = {};
  marks.forEach(mark => {
    if (!mark || !mark.type) return;
    if (mark.type === 'bold' || mark.type === 'strong') flags.bold = true;
    if (mark.type === 'italic' || mark.type === 'em') flags.italic = true;
    if (mark.type === 'underline') flags.underline = true;
  });
  return flags;
}

function resolveAnnotationAnchors(annotations = [], paragraphs = []) {
  const inline = [];
  const orphan = [];

  annotations.forEach(ann => {
    const resolved = resolveSingleAnnotation(ann, paragraphs);
    if (resolved) inline.push(resolved);
    else orphan.push(ann);
  });

  return { inlineAnnotations: inline, orphanAnnotations: orphan };
}

function resolveSingleAnnotation(annotation, paragraphs) {
  if (!paragraphs.length) return null;
  const hasValidOffsets = Number.isInteger(annotation.text_start) && Number.isInteger(annotation.text_end) && annotation.text_end > annotation.text_start;

  if (hasValidOffsets) {
    const targetIndex = paragraphs.findIndex(p => annotation.text_start >= p.globalStart && annotation.text_start < p.globalEnd);
    if (targetIndex >= 0) {
      const paragraph = paragraphs[targetIndex];
      const relStart = Math.max(0, annotation.text_start - paragraph.globalStart);
      const relEnd = Math.min(paragraph.globalEnd, annotation.text_end) - paragraph.globalStart;
      if (relEnd > relStart) {
        return {
          ...annotation,
          paragraphIndex: targetIndex,
          relStart,
          relEnd,
          authorName: annotation.author?.display_name || annotation.author?.email || '老師'
        };
      }
    }
  }

  if (annotation.text_quote) {
    const quote = annotation.text_quote;
    for (let idx = 0; idx < paragraphs.length; idx += 1) {
      const paragraphText = paragraphs[idx].runs.map(run => run.text).join('');
      const quoteIndex = paragraphText.indexOf(quote);
      if (quoteIndex >= 0) {
        return {
          ...annotation,
          paragraphIndex: idx,
          relStart: quoteIndex,
          relEnd: quoteIndex + quote.length,
          authorName: annotation.author?.display_name || annotation.author?.email || '老師'
        };
      }
    }
  }

  return null;
}

function buildParagraphNode(docx, paragraph, annotations) {
  const { Paragraph, TextRun, CommentRangeStart, CommentRangeEnd, CommentReference } = docx;
  const children = [];
  const annotationState = new Map();
  annotations.forEach(ann => {
    annotationState.set(ann.id, { started: false, ended: false, docxId: ann.docxId });
  });

  paragraph.runs.forEach(run => {
    const segments = splitRunByAnnotations(run, annotations);
    segments.forEach(segment => {
      if (!segment.text) return;
      const annotation = segment.annotation ? annotationState.get(segment.annotation.id) : null;
      if (annotation && segment.isStart && !annotation.started) {
        children.push(new CommentRangeStart(segment.annotation.docxId));
        annotation.started = true;
      }

      children.push(new TextRun({
        text: segment.text,
        bold: segment.marks.bold,
        italics: segment.marks.italic,
        underline: segment.marks.underline ? {} : undefined
      }));

      if (annotation && segment.isEnd && !annotation.ended) {
        children.push(new CommentRangeEnd(segment.annotation.docxId));
        children.push(new CommentReference(segment.annotation.docxId));
        annotation.ended = true;
      }
    });
  });

  if (!children.length) {
    children.push(new TextRun({ text: '' }));
  }

  return new Paragraph({
    children,
    spacing: { after: 200 },
    heading: paragraph.type === 'heading' ? determineHeading(paragraph.level, docx) : undefined
  });
}

function splitRunByAnnotations(run, annotations) {
  if (!annotations.length) {
    return [{
      text: run.text,
      marks: run.marks,
      annotation: null,
      isStart: false,
      isEnd: false
    }];
  }

  const boundaries = new Set([0, run.text.length]);
  annotations.forEach(ann => {
    const overlaps = ann.relStart < run.relEnd && ann.relEnd > run.relStart;
    if (!overlaps) return;
    const startCut = Math.max(0, ann.relStart - run.relStart);
    const endCut = Math.min(run.text.length, ann.relEnd - run.relStart);
    boundaries.add(startCut);
    boundaries.add(endCut);
  });

  const sorted = Array.from(boundaries).sort((a, b) => a - b);
  const segments = [];

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const segStart = sorted[i];
    const segEnd = sorted[i + 1];
    if (segEnd <= segStart) continue;
    const absoluteStart = run.relStart + segStart;
    const absoluteEnd = run.relStart + segEnd;
    const annotation = annotations.find(ann => ann.relStart < absoluteEnd && ann.relEnd > absoluteStart) || null;
    segments.push({
      text: run.text.slice(segStart, segEnd),
      marks: run.marks,
      annotation,
      isStart: annotation ? absoluteStart === annotation.relStart : false,
      isEnd: annotation ? absoluteEnd === annotation.relEnd : false
    });
  }

  return segments.length ? segments : [{
    text: run.text,
    marks: run.marks,
    annotation: null,
    isStart: false,
    isEnd: false
  }];
}

function determineHeading(level, docx) {
  switch (level) {
    case 1:
      return docx.HeadingLevel.HEADING_1;
    case 2:
      return docx.HeadingLevel.HEADING_2;
    case 3:
      return docx.HeadingLevel.HEADING_3;
    default:
      return docx.HeadingLevel.HEADING_2;
  }
}

function buildMetadataSection(docx, { essay, assignment, student, studentName, studentEmail, grade }) {
  const { Paragraph, TextRun } = docx;
  const exportTime = new Date();
  const resolvedStudentName = studentName || student?.display_name || student?.email || '學生';
  const resolvedEmail = studentEmail || student?.email || '';

  const titleParagraph = new Paragraph({
    heading: docx.HeadingLevel.TITLE,
    spacing: { after: 200 },
    children: [
      new TextRun({
        text: essay?.title || assignment?.title || '學生作文',
        bold: true
      })
    ]
  });

  const metaParagraph = new Paragraph({
    spacing: { after: 200 },
    children: [
      new TextRun({ text: `學生：${resolvedStudentName}`, bold: true }),
      new TextRun({ text: resolvedEmail ? `（${resolvedEmail}）` : '' }),
      new TextRun({ text: assignment?.title ? `　｜　作業：${assignment.title}` : '' })
    ]
  });

  const gradingInfoParagraph = new Paragraph({
    spacing: { after: 200 },
    children: [
      new TextRun({
        text: `老師：${grade?.teacher?.display_name || '老師'}　｜　總分：${grade?.total_score ?? '—'}　｜　導出時間：${formatDate(exportTime)}`
      })
    ]
  });

  return [titleParagraph, metaParagraph, gradingInfoParagraph];
}

function buildSummarySection(docx, { grade, orphanAnnotations }) {
  const { Paragraph, TextRun } = docx;
  const sections = [];

  sections.push(new Paragraph({
    spacing: { before: 200, after: 100 },
    heading: docx.HeadingLevel.HEADING_2,
    children: [new TextRun({ text: '老師總評與分數', bold: true })]
  }));

  const overall = grade?.overall_comment
    ? grade.overall_comment.split('\n').map(line => new Paragraph({
      spacing: { after: 100 },
      children: [new TextRun({ text: line })]
    }))
    : [new Paragraph({ children: [new TextRun({ text: '（尚無總評內容）' })] })];

  sections.push(...overall);

  const criteria = ['a', 'b', 'c', 'd']
    .map(code => ({ code, value: grade?.[`criterion_${code}_score`] }))
    .filter(item => typeof item.value === 'number');

  if (criteria.length) {
    criteria.forEach(item => {
      sections.push(new Paragraph({
        children: [
          new TextRun({ text: `標準 ${item.code.toUpperCase()}：`, bold: true }),
          new TextRun({ text: `${item.value} / 8` })
        ]
      }));
    });
  }

  if (orphanAnnotations.length) {
    sections.push(new Paragraph({
      spacing: { before: 200, after: 100 },
      heading: docx.HeadingLevel.HEADING_3,
      children: [new TextRun({ text: '附錄：無法對應原文的批註', bold: true })]
    }));
    orphanAnnotations.forEach((ann, idx) => {
      sections.push(new Paragraph({
        children: [
          new TextRun({ text: `${idx + 1}. ${ann.content || '（無內容）'}` })
        ]
      }));
    });
  }

  return sections;
}

function buildCommentParagraphs(docx, annotation) {
  const { Paragraph, TextRun } = docx;
  const parts = [];
  const header = `${annotation.author?.display_name || '老師'}（${formatDate(annotation.created_at)}）`;
  parts.push(new Paragraph({
    children: [new TextRun({ text: header, bold: true })]
  }));

  const contentLines = (annotation.content || '').split('\n');
  if (contentLines.length) {
    contentLines.forEach(line => parts.push(new Paragraph({ children: [new TextRun({ text: line })] })));
  } else {
    parts.push(new Paragraph({ children: [new TextRun({ text: '（無批註內容）' })] }));
  }

  if (annotation.text_quote) {
    parts.push(new Paragraph({
      children: [
        new TextRun({ text: '原句：', italics: true }),
        new TextRun({ text: annotation.text_quote.trim(), italics: true })
      ]
    }));
  }

  if (annotation.replies?.length) {
    annotation.replies.forEach(reply => {
      parts.push(new Paragraph({
        children: [
          new TextRun({ text: `回覆 - ${reply.user?.display_name || '用戶'}：` }),
          new TextRun({ text: reply.content || '' })
        ]
      }));
    });
  }

  return parts;
}

function buildFilename({ assignmentTitle, essayTitle, studentName }) {
  const baseName = [
    assignmentTitle || essayTitle || '作文',
    studentName || '學生',
    formatDate(new Date(), { forFilename: true })
  ].filter(Boolean).join('_');
  return `${sanitizeFilename(baseName)}.docx`;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function sanitizeFilename(name) {
  return name.replace(/[\\/:*?"<>|]+/g, '-');
}

function formatDate(dateLike, options = {}) {
  if (!dateLike) return '-';
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(date.getTime())) return '-';
  if (options.forFilename) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
  }
  return date.toLocaleString('zh-Hant-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}


