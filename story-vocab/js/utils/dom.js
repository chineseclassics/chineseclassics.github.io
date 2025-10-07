/**
 * DOM 操作辅助模块
 * 提供常用的 DOM 操作封装
 */

/**
 * 获取单个元素
 * @param {string} selector - CSS 选择器
 * @returns {HTMLElement|null}
 */
export function $(selector) {
    return document.querySelector(selector);
}

/**
 * 获取多个元素
 * @param {string} selector - CSS 选择器
 * @returns {NodeList}
 */
export function $$(selector) {
    return document.querySelectorAll(selector);
}

/**
 * 通过 ID 获取元素
 * @param {string} id - 元素 ID
 * @returns {HTMLElement|null}
 */
export function getById(id) {
    return document.getElementById(id);
}

/**
 * 创建元素
 * @param {string} tag - 标签名
 * @param {Object} attrs - 属性对象
 * @param {string|HTMLElement|Array} children - 子元素
 * @returns {HTMLElement}
 */
export function createElement(tag, attrs = {}, children = null) {
    const element = document.createElement(tag);
    
    // 设置属性
    Object.keys(attrs).forEach(key => {
        if (key === 'className') {
            element.className = attrs[key];
        } else if (key === 'style' && typeof attrs[key] === 'object') {
            Object.assign(element.style, attrs[key]);
        } else {
            element.setAttribute(key, attrs[key]);
        }
    });
    
    // 添加子元素
    if (children) {
        if (Array.isArray(children)) {
            children.forEach(child => {
                if (typeof child === 'string') {
                    element.appendChild(document.createTextNode(child));
                } else if (child instanceof HTMLElement) {
                    element.appendChild(child);
                }
            });
        } else if (typeof children === 'string') {
            element.textContent = children;
        } else if (children instanceof HTMLElement) {
            element.appendChild(children);
        }
    }
    
    return element;
}

/**
 * 显示/隐藏元素
 * @param {HTMLElement} element - 要操作的元素
 * @param {boolean} show - 是否显示
 */
export function toggleDisplay(element, show) {
    if (!element) return;
    element.style.display = show ? '' : 'none';
}

/**
 * 添加类名
 * @param {HTMLElement} element - 要操作的元素
 * @param {string} className - 类名
 */
export function addClass(element, className) {
    if (element) element.classList.add(className);
}

/**
 * 移除类名
 * @param {HTMLElement} element - 要操作的元素
 * @param {string} className - 类名
 */
export function removeClass(element, className) {
    if (element) element.classList.remove(className);
}

/**
 * 切换类名
 * @param {HTMLElement} element - 要操作的元素
 * @param {string} className - 类名
 */
export function toggleClass(element, className) {
    if (element) element.classList.toggle(className);
}

/**
 * 显示加载动画
 * @param {boolean} show - 是否显示
 */
export function showLoading(show) {
    const loading = getById('loading');
    if (loading) {
        if (show) {
            loading.classList.add('active');
        } else {
            loading.classList.remove('active');
        }
    }
}

