// 全局变量
let currentArticle = null;
let currentIndex = 0;
let startTime = null;
let correctCount = 0;
let totalCount = 0;
let timer = null;
let dictWorker = null;
let currentContentType = 'default';
let currentArticleIndex = 0;
let xinhuaDict = null;
let inputBoxes = [];
let currentLineIndex = 0;
let loadedLines = 0;
// 已加载的输入框行数
let loadedInputLines = 0;
const MAX_LINES_PER_LOAD = 10;
// 存储每行的输入内容
let inputContents = {};
// 阅读模式的全局变量
let currentReadArticle = null;
let currentReadPage = 0;
const READ_PAGE_SIZE = 500; // 每页显示的字符数

// DOM元素
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const articleSelection = document.getElementById('article-selection');
const practiceArea = document.getElementById('practice-area');
const currentLine = document.getElementById('current-line');
const currentCharElement = document.getElementById('current-char');
const pinyinElement = document.getElementById('pinyin');
const definitionElement = document.getElementById('definition');
const phrasesElement = document.getElementById('phrases');
const charCountElement = document.getElementById('char-count');
const accuracyElement = document.getElementById('accuracy');
const timeElapsedElement = document.getElementById('time-elapsed');
const statPlaceholder = document.querySelector('.stat-placeholder');
const statDetails = document.querySelector('.stat-details');
const tabBtns = document.querySelectorAll('.tab-btn');
const articleItems = document.getElementById('article-items');
const themeToggle = document.getElementById('theme-toggle');

// 内容数据
let contentData = {};

// 加载练习文章
function loadPracticeArticles() {
    // 首先获取练习文章目录内容
    const articlesPath = '练习文章/';

    fetch(articlesPath)
        .then(response => {
            if (!response.ok) throw new Error('Failed to load articles directory');
            return response.text();
        })
        .then(html => {
            // 解析HTML获取分类目录
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // 获取所有分类目录
            const categoryLinks = doc.querySelectorAll('a[href$="/"]');

            // 清空contentData
            contentData = {};

            // 收集所有分类
            const categories = [];

            categoryLinks.forEach(link => {
                const href = link.getAttribute('href');
                if (href && !href.startsWith('..') && !href.startsWith('/')) {
                    const category = decodeURIComponent(href).replace('/', '');
                    // 初始化分类数据
                    contentData[category] = {
                        title: category,
                        articles: []
                    };
                    categories.push(category);

                    // 加载该分类的文章
                    loadCategoryArticles(category);
                }
            });

            // 动态生成标签页
            generateTabs(categories);
        })
        .catch(error => {
            console.error('Failed to load articles directory:', error);
        });
}

// 解析content.opf文件，找到所有的HTML/XHTML内容文件
function parseContentOpf(contentOpf) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(contentOpf, 'application/xml');

    // 首先尝试从spine元素获取阅读顺序
    const spine = doc.querySelector('spine');
    const itemrefs = spine ? spine.querySelectorAll('itemref') : [];
    const contentFiles = [];

    if (itemrefs.length > 0) {
        // 从spine元素获取阅读顺序
        itemrefs.forEach(itemref => {
            const idref = itemref.getAttribute('idref');
            if (idref) {
                const item = doc.querySelector(`item[id="${idref}"]`);
                if (item && (item.getAttribute('media-type') === 'application/xhtml+xml' || item.getAttribute('media-type') === 'text/html')) {
                    const href = item.getAttribute('href');
                    if (href) {
                        contentFiles.push(href);
                    }
                }
            }
        });
    } else {
        // 如果没有spine元素，就直接获取所有HTML/XHTML文件
        const items = doc.querySelectorAll('item[media-type="application/xhtml+xml"], item[media-type="text/html"]');
        items.forEach(item => {
            const href = item.getAttribute('href');
            if (href) {
                contentFiles.push(href);
            }
        });
    }

    return contentFiles;
}

// 查找包含"第一章"的内容文件，返回从第二个"第一章"开始的文件
function findChapterOneContent(zip, contentFiles) {
    // 首先查找index_split_000.html文件
    const indexFile = contentFiles.find(filePath => filePath.includes('index_split_000.html'));

    if (indexFile) {
        const entry = zip.file(indexFile);
        if (entry) {
            return entry.async('text').then(text => {
                // 解析HTML，提取所有p标签的文本
                const parser = new DOMParser();
                const doc = parser.parseFromString(text, 'text/html');
                const pTags = doc.querySelectorAll('p');

                // 收集所有p标签的文本内容
                const pTexts = [];
                pTags.forEach(p => {
                    pTexts.push(p.textContent.trim());
                });

                // 合并所有p标签的文本
                const combinedText = pTexts.join(' ');

                // 查找第一个和第二个"第一章"的位置
                const firstIndex = combinedText.indexOf('第一章');
                if (firstIndex !== -1) {
                    const secondIndex = combinedText.indexOf('第一章', firstIndex + 3);
                    if (secondIndex !== -1) {
                        // 从第二个"第一章"开始提取内容
                        const mainContent = combinedText.substring(secondIndex);
                        // 创建一个临时文件路径，用于返回内容
                        return Promise.resolve([indexFile]);
                    }
                }

                // 如果没有找到第二个"第一章"，返回第一个包含"第一章"的文件
                return findFallbackChapterOne(zip, contentFiles);
            }).catch(error => {
                console.error(`Error reading index_split_000.html:`, error);
                // 出错时使用 fallback 方法
                return findFallbackChapterOne(zip, contentFiles);
            });
        }
    }

    // 如果没有找到index_split_000.html文件，使用 fallback 方法
    return findFallbackChapterOne(zip, contentFiles);
}

//  fallback 方法：查找包含"第一章"的文件
function findFallbackChapterOne(zip, contentFiles) {
    // 创建一个Promise数组，用于并行读取所有文件
    const filePromises = contentFiles.map(filePath => {
        const entry = zip.file(filePath);
        if (entry) {
            return entry.async('text').then(text => {
                // 移除HTML标签，只保留文字
                const plainText = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
                // 返回文件路径和是否包含"第一章"
                return {
                    filePath: filePath,
                    hasChapterOne: plainText.includes('第一章')
                };
            }).catch(error => {
                console.error(`Error reading file ${filePath}:`, error);
                return {
                    filePath: filePath,
                    hasChapterOne: false
                };
            });
        }
        return Promise.resolve({
            filePath: filePath,
            hasChapterOne: false
        });
    });

    // 等待所有文件读取完成
    return Promise.all(filePromises).then(results => {
        // 收集包含"第一章"的文件
        const chapterOneFiles = results.filter(result => result.hasChapterOne).map(result => result.filePath);

        // 如果找到至少两个包含"第一章"的文件，返回从第二个开始的所有文件
        if (chapterOneFiles.length >= 2) {
            const secondChapterOneFile = chapterOneFiles[1];
            const startIndex = contentFiles.indexOf(secondChapterOneFile);
            if (startIndex !== -1) {
                return contentFiles.slice(startIndex);
            }
        }

        // 如果找到至少一个包含"第一章"的文件，返回第一个
        if (chapterOneFiles.length > 0) {
            return [chapterOneFiles[0]];
        }

        // 如果没有找到任何包含"第一章"的文件，返回第一个内容文件（跳过可能的前言/目录）
        return contentFiles.length > 1 ? contentFiles.slice(1, 2) : contentFiles;
    });
}

// 动态生成标签页
function generateTabs(categories) {
    const tabsContainer = document.getElementById('content-tabs');
    if (!tabsContainer) return;

    // 清空现有标签页
    tabsContainer.innerHTML = '';

    // 为每个分类创建标签页
    categories.forEach((category, index) => {
        const tabBtn = document.createElement('button');
        tabBtn.className = `tab-btn ${index === 0 ? 'active' : ''}`;
        tabBtn.dataset.type = category;
        tabBtn.textContent = contentData[category].title;

        // 添加点击事件
        tabBtn.addEventListener('click', function () {
            // 移除所有标签页的active类
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            // 添加当前标签页的active类
            this.classList.add('active');
            // 更新当前内容类型
            currentContentType = this.dataset.type;
            // 重置当前文章索引
            currentArticleIndex = 0;
            // 显示对应分类的文章列表
            displayArticleList(currentContentType);
        });

        tabsContainer.appendChild(tabBtn);
    });

    // 设置默认内容类型
    if (categories.length > 0) {
        currentContentType = categories[0];
        // 显示默认分类的文章列表
        setTimeout(() => {
            displayArticleList(currentContentType);
        }, 500);
    }
}

// 加载指定分类的文章
function loadCategoryArticles(category) {
    const categoryPath = `练习文章/${category}/`;

    fetch(categoryPath)
        .then(response => {
            if (!response.ok) throw new Error('Failed to load directory');
            return response.text();
        })
        .then(html => {
            // 解析HTML获取文件列表
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // 获取所有链接，包括子目录和文件
            const allLinks = doc.querySelectorAll('a');

            // 筛选出子目录和文件
            const subdirs = [];
            const files = [];

            allLinks.forEach(link => {
                const href = link.getAttribute('href');
                if (href.endsWith('/') && !href.startsWith('..')) {
                    // 子目录
                    subdirs.push(href);
                } else if (href.endsWith('.txt') || href.endsWith('.md') || href.endsWith('.epub')) {
                    // 文件
                    files.push(href);
                }
            });

            // 先加载直接在分类目录下的文件
            files.forEach(fileName => {
                // 解码URL编码的文件名
                const decodedFileName = decodeURIComponent(fileName);
                const filePath = categoryPath + fileName;

                if (decodedFileName.endsWith('.epub')) {
                    // 处理epub文件
                    fetch(filePath)
                        .then(response => response.arrayBuffer())
                        .then(buffer => {
                            // 使用JSZip解压epub文件
                            return JSZip.loadAsync(buffer);
                        })
                        .then(zip => {
                            // 提取文件名作为标题（去除扩展名）
                            const title = decodedFileName.replace(/\.epub$/, '');

                            // 查找content.opf文件
                            let contentOpfPath = null;
                            const promises = [];

                            // 遍历zip文件中的所有文件
                            zip.forEach((relativePath, zipEntry) => {
                                if (relativePath.endsWith('content.opf')) {
                                    contentOpfPath = relativePath;
                                    // 读取content.opf文件
                                    promises.push(zipEntry.async('text'));
                                }
                            });

                            return Promise.all(promises).then(results => {
                                if (results.length > 0) {
                                    const contentOpf = results[0];
                                    // 解析content.opf文件，找到所有的HTML/XHTML内容文件
                                    const contentFiles = parseContentOpf(contentOpf);

                                    // 查找包含"第一章"的内容文件，返回从第二个"第一章"开始的文件
                                    return findChapterOneContent(zip, contentFiles).then(selectedFiles => {
                                        // 读取所有选中的内容文件
                                        const contentPromises = selectedFiles.map(filePath => {
                                            const entry = zip.file(filePath);
                                            if (entry) {
                                                return entry.async('text');
                                            }
                                            return Promise.resolve('');
                                        });

                                        return Promise.all(contentPromises).then(contentTexts => {
                                            // 提取文字内容
                                            const extractedContent = contentTexts.map((text, index) => {
                                                const filePath = selectedFiles[index];
                                                // 检查是否是index_split_000.html文件
                                                if (filePath.includes('index_split_000.html')) {
                                                    // 解析HTML，提取所有p标签的文本
                                                    const parser = new DOMParser();
                                                    const doc = parser.parseFromString(text, 'text/html');
                                                    const pTags = doc.querySelectorAll('p');

                                                    // 收集所有p标签的文本内容
                                                    const pTexts = [];
                                                    pTags.forEach(p => {
                                                        pTexts.push(p.textContent.trim());
                                                    });

                                                    // 合并所有p标签的文本
                                                    const combinedText = pTexts.join(' ');

                                                    // 查找第一个和第二个"第一章"的位置
                                                    const firstIndex = combinedText.indexOf('第一章');
                                                    if (firstIndex !== -1) {
                                                        const secondIndex = combinedText.indexOf('第一章', firstIndex + 3);
                                                        if (secondIndex !== -1) {
                                                            // 从第二个"第一章"开始提取内容
                                                            return combinedText.substring(secondIndex).trim();
                                                        }
                                                    }
                                                }
                                                // 对于其他文件，直接移除HTML标签
                                                return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
                                            }).join('\n\n');

                                            // 添加到对应分类
                                            contentData[category].articles.push({
                                                title: title,
                                                content: extractedContent
                                            });
                                        });
                                    });
                                } else {
                                    // 找不到content.opf文件
                                    contentData[category].articles.push({
                                        title: title,
                                        content: `[EPUB] ${title}\n\n错误：找不到content.opf文件，无法提取内容。`
                                    });
                                }
                            });
                        })
                        .catch(error => {
                            console.error(`Failed to load epub file ${filePath}:`, error);
                            const title = decodedFileName.replace(/\.epub$/, '');
                            contentData[category].articles.push({
                                title: title,
                                content: `[EPUB] ${title}\n\n错误：无法解析epub文件 - ${error.message}`
                            });
                        });
                } else {
                    // 处理txt和md文件
                    fetch(filePath)
                        .then(response => response.text())
                        .then(content => {
                            // 提取文件名作为标题（去除扩展名）
                            const title = decodedFileName.replace(/\.(txt|md)$/, '');
                            // 添加到对应分类
                            contentData[category].articles.push({
                                title: title,
                                content: content.trim()
                            });
                        })
                        .catch(error => {
                            console.error(`Failed to load article ${filePath}:`, error);
                        });
                }
            });

            // 然后加载子目录中的文件（特别是课本分类）
            subdirs.forEach(subdir => {
                const subdirPath = categoryPath + subdir;

                fetch(subdirPath)
                    .then(response => {
                        if (!response.ok) throw new Error('Failed to load subdirectory');
                        return response.text();
                    })
                    .then(subdirHtml => {
                        const subdirDoc = parser.parseFromString(subdirHtml, 'text/html');
                        const subdirFiles = subdirDoc.querySelectorAll('a[href$=".txt"], a[href$=".md"], a[href$=".epub"]');

                        subdirFiles.forEach(link => {
                            const fileName = link.getAttribute('href');
                            // 解码URL编码的文件名
                            const decodedFileName = decodeURIComponent(fileName);
                            const filePath = subdirPath + fileName;

                            if (decodedFileName.endsWith('.epub')) {
                                // 处理epub文件
                                fetch(filePath)
                                    .then(response => response.arrayBuffer())
                                    .then(buffer => {
                                        // 使用JSZip解压epub文件
                                        return JSZip.loadAsync(buffer);
                                    })
                                    .then(zip => {
                                        // 提取子目录名和文件名作为标题
                                        const subdirName = decodeURIComponent(subdir.replace('/', ''));
                                        const fileNameWithoutExt = decodedFileName.replace(/\.epub$/, '');
                                        const title = `${subdirName} - ${fileNameWithoutExt}`;

                                        // 查找content.opf文件
                                        let contentOpfPath = null;
                                        const promises = [];

                                        // 遍历zip文件中的所有文件
                                        zip.forEach((relativePath, zipEntry) => {
                                            if (relativePath.endsWith('content.opf')) {
                                                contentOpfPath = relativePath;
                                                // 读取content.opf文件
                                                promises.push(zipEntry.async('text'));
                                            }
                                        });

                                        return Promise.all(promises).then(results => {
                                            if (results.length > 0) {
                                                const contentOpf = results[0];
                                                // 解析content.opf文件，找到所有的HTML/XHTML内容文件
                                                const contentFiles = parseContentOpf(contentOpf);

                                                // 查找包含"第一章"的内容文件，返回从第二个"第一章"开始的文件
                                                return findChapterOneContent(zip, contentFiles).then(selectedFiles => {
                                                    // 读取所有选中的内容文件
                                                    const contentPromises = selectedFiles.map(filePath => {
                                                        const entry = zip.file(filePath);
                                                        if (entry) {
                                                            return entry.async('text');
                                                        }
                                                        return Promise.resolve('');
                                                    });

                                                    return Promise.all(contentPromises).then(contentTexts => {
                                                        // 提取文字内容
                                                        const extractedContent = contentTexts.map((text, index) => {
                                                            const filePath = selectedFiles[index];
                                                            // 检查是否是index_split_000.html文件
                                                            if (filePath.includes('index_split_000.html')) {
                                                                // 解析HTML，提取所有p标签的文本
                                                                const parser = new DOMParser();
                                                                const doc = parser.parseFromString(text, 'text/html');
                                                                const pTags = doc.querySelectorAll('p');

                                                                // 收集所有p标签的文本内容
                                                                const pTexts = [];
                                                                pTags.forEach(p => {
                                                                    pTexts.push(p.textContent.trim());
                                                                });

                                                                // 合并所有p标签的文本
                                                                const combinedText = pTexts.join(' ');

                                                                // 查找第一个和第二个"第一章"的位置
                                                                const firstIndex = combinedText.indexOf('第一章');
                                                                if (firstIndex !== -1) {
                                                                    const secondIndex = combinedText.indexOf('第一章', firstIndex + 3);
                                                                    if (secondIndex !== -1) {
                                                                        // 从第二个"第一章"开始提取内容
                                                                        return combinedText.substring(secondIndex).trim();
                                                                    }
                                                                }
                                                            }
                                                            // 对于其他文件，直接移除HTML标签
                                                            return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
                                                        }).join('\n\n');

                                                        // 添加到对应分类
                                                        contentData[category].articles.push({
                                                            title: title,
                                                            content: extractedContent
                                                        });
                                                    });
                                                });
                                            } else {
                                                // 找不到content.opf文件
                                                contentData[category].articles.push({
                                                    title: title,
                                                    content: `[EPUB] ${title}\n\n错误：找不到content.opf文件，无法提取内容。`
                                                });
                                            }
                                        });
                                    })
                                    .catch(error => {
                                        console.error(`Failed to load epub file ${filePath}:`, error);
                                        const subdirName = decodeURIComponent(subdir.replace('/', ''));
                                        const fileNameWithoutExt = decodedFileName.replace(/\.epub$/, '');
                                        const title = `${subdirName} - ${fileNameWithoutExt}`;
                                        contentData[category].articles.push({
                                            title: title,
                                            content: `[EPUB] ${title}\n\n错误：无法解析epub文件 - ${error.message}`
                                        });
                                    });
                            } else {
                                // 处理txt和md文件
                                fetch(filePath)
                                    .then(response => response.text())
                                    .then(content => {
                                        // 提取子目录名和文件名作为标题
                                        const subdirName = decodeURIComponent(subdir.replace('/', ''));
                                        const fileNameWithoutExt = decodedFileName.replace(/\.(txt|md)$/, '');
                                        const title = `${subdirName} - ${fileNameWithoutExt}`;
                                        // 添加到对应分类
                                        contentData[category].articles.push({
                                            title: title,
                                            content: content.trim()
                                        });
                                    })
                                    .catch(error => {
                                        console.error(`Failed to load article ${filePath}:`, error);
                                    });
                            }
                        });
                    })
                    .catch(error => {
                        console.error(`Failed to load subdirectory ${subdirPath}:`, error);
                    });
            });
        })
        .catch(error => {
            console.error(`Failed to load articles for category ${category}:`, error);
        });
}

// 初始化
function init() {
    // 加载练习文章
    loadPracticeArticles();

    // 添加按钮点击事件
    startBtn.addEventListener('click', startPractice);
    resetBtn.addEventListener('click', resetPractice);

    // 添加朗读按钮点击事件
    const speakCharBtn = document.getElementById('speak-char-btn');
    if (speakCharBtn) {
        speakCharBtn.addEventListener('click', function () {
            const currentChar = document.getElementById('current-char').textContent;
            if (currentChar) {
                speakNextChar(currentChar, true);
            }
        });
    }

    // 添加上下页按钮点击事件（用于练习页面）
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');

    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', function () {
            // 练习页面上一页逻辑
            const pageSize = 10;
            if (loadedInputLines >= pageSize) {
                loadedInputLines -= pageSize;
                updateTextDisplay();
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', function () {
            // 练习页面下一页逻辑
            const allLines = calculateAllInputLines();
            const totalLines = allLines.length;
            const pageSize = 10;
            if (loadedInputLines + pageSize < totalLines) {
                loadedInputLines += pageSize;
                updateTextDisplay();
            }
        });
    }

    // 添加阅读按钮点击事件
    const readBtn = document.getElementById('read-btn');
    const readArea = document.getElementById('read-area');
    const articleSelection = document.getElementById('article-selection');
    const readContent = document.getElementById('read-content');
    const readPrevBtn = document.getElementById('read-prev-btn');
    const readNextBtn = document.getElementById('read-next-btn');
    const exitReadBtn = document.getElementById('exit-read-btn');



    if (readBtn) {
        readBtn.addEventListener('click', function () {
            // 获取当前内容类型的文章列表
            const articles = contentData[currentContentType].articles;

            if (articles.length === 0) {
                alert('当前分类下没有练习文章');
                return;
            }

            // 获取当前选中的文章
            currentReadArticle = articles[currentArticleIndex];
            currentReadPage = 0;

            // 显示阅读界面，隐藏文章选择界面
            articleSelection.style.display = 'none';
            readArea.style.display = 'block';

            // 显示阅读内容
            updateReadDisplay();

            // 为阅读内容添加文本选择事件监听器
            const readContent = document.getElementById('read-content');
            if (readContent) {
                readContent.addEventListener('mouseup', function () {
                    // 获取用户选中的文本
                    const selection = window.getSelection();
                    const selectedText = selection.toString().trim();

                    if (selectedText && currentReadArticle) {
                        // 获取当前页面的完整内容
                        const content = currentReadArticle.content;
                        const startIndex = currentReadPage * READ_PAGE_SIZE;
                        const endIndex = Math.min((currentReadPage + 1) * READ_PAGE_SIZE, content.length);
                        const pageContent = content.substring(startIndex, endIndex);

                        // 找到选中文本在页面内容中的位置
                        const selectedIndex = pageContent.indexOf(selectedText);

                        if (selectedIndex !== -1) {
                            // 从选中的文本开始，提取到页面结束的内容
                            const contentToRead = pageContent.substring(selectedIndex);

                            // 从选中的文本开始朗读完整页
                            speakReadContent(contentToRead, true);

                            // 高亮显示选中的文本
                            const range = selection.getRangeAt(0);
                            const highlight = document.createElement('span');
                            highlight.style.backgroundColor = '#ffffcc';
                            highlight.style.padding = '2px';
                            range.surroundContents(highlight);

                            // 清除高亮（3秒后）
                            setTimeout(function () {
                                if (highlight.parentNode) {
                                    const text = highlight.textContent;
                                    const parent = highlight.parentNode;
                                    parent.replaceChild(document.createTextNode(text), highlight);
                                }
                            }, 3000);
                        }
                    }
                });
            }
        });
    }

    // 添加退出阅读按钮点击事件
    if (exitReadBtn) {
        exitReadBtn.addEventListener('click', function () {
            // 停止朗读
            if ('speechSynthesis' in window) {
                speechSynthesis.cancel();
            }
            // 隐藏阅读界面，显示文章选择界面
            readArea.style.display = 'none';
            articleSelection.style.display = 'block';
        });
    }

    // 添加阅读界面上一页按钮点击事件
    if (readPrevBtn) {
        readPrevBtn.addEventListener('click', function () {
            if (currentReadPage > 0) {
                // 停止当前朗读
                if ('speechSynthesis' in window) {
                    speechSynthesis.cancel();
                }
                currentReadPage--;
                updateReadDisplay();
            }
        });
    }

    // 添加阅读界面下一页按钮点击事件
    if (readNextBtn) {
        readNextBtn.addEventListener('click', function () {
            const content = currentReadArticle.content;
            if ((currentReadPage + 1) * READ_PAGE_SIZE < content.length) {
                // 停止当前朗读
                if ('speechSynthesis' in window) {
                    speechSynthesis.cancel();
                }
                currentReadPage++;
                updateReadDisplay();
            }
        });
    }

    // 移除对inputBox的事件监听器，现在使用动态生成的line-input

    // 添加主题切换按钮点击事件
    themeToggle.addEventListener('click', toggleTheme);

    // 初始化词典工作器
    initDictWorker();
}

// 切换主题
function toggleTheme() {
    const body = document.body;
    const isDarkTheme = body.classList.contains('dark-theme');

    if (isDarkTheme) {
        // 切换到浅色主题
        body.classList.remove('dark-theme');
        themeToggle.textContent = '🌙 切换主题';
        localStorage.setItem('theme', 'light');
    } else {
        // 切换到深色主题
        body.classList.add('dark-theme');
        themeToggle.textContent = '☀️ 切换主题';
        localStorage.setItem('theme', 'dark');
    }
}

// 初始化词典工作器
function initDictWorker() {
    // 加载chinese-xinhua词典
    loadXinhuaDict();

    // 创建一个词典查询函数，优先使用dict目录中的资源，fallback到dictionary.js
    window.queryDict = function (word) {
        // 首先尝试从chinese-xinhua中获取
        if (xinhuaDict && xinhuaDict[word]) {
            return xinhuaDict[word];
        }

        // 不再尝试从dictionary.js中获取，因为已经移除了对它的引用
        // 直接使用chinese-xinhua词典

        // 最后尝试从iframe中查询词典
        const iframe = document.getElementById('dict-iframe');
        if (iframe && iframe.contentWindow && iframe.contentWindow.queryDict) {
            const result = iframe.contentWindow.queryDict(word);
            if (result) {
                return result;
            }
        }

        return null;
    };

    // 预加载词典相关资源
    preloadDictResources();
}

// 加载chinese-xinhua词典
function loadXinhuaDict() {
    fetch('chinese-xinhua/data/word.json')
        .then(response => response.json())
        .then(data => {
            // 创建汉字到信息的映射
            xinhuaDict = {};
            data.forEach(item => {
                const char = item.word;
                // 提取拼音（可能有多个读音）
                const pinyinMatch = item.pinyin.match(/[a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùüǖǘǚǜ]+/g) || [];
                const pinyin = pinyinMatch.length > 0 ? pinyinMatch : item.pinyin;

                // 保留完整的解释信息
                const definition = item.explanation || '';

                // 构建词典条目
                xinhuaDict[char] = {
                    pinyin: pinyin.length > 1 ? pinyin : pinyin[0],
                    definition: definition,
                    explanation: item.explanation || '',
                    strokes: item.strokes || '',
                    radicals: item.radicals || '',
                    oldword: item.oldword || '',
                    more: item.more || '',
                    phrases: []
                };
            });
            console.log('chinese-xinhua词典加载完成，共收录', Object.keys(xinhuaDict).length, '个汉字');
        })
        .catch(error => {
            console.error('加载chinese-xinhua词典失败:', error);
            xinhuaDict = null;
        });
}

// 预加载词典相关资源
function preloadDictResources() {
    // 创建一个隐藏的iframe来加载词典资源
    const iframe = document.createElement('iframe');
    iframe.src = 'dict/hycd_3rd.html';
    iframe.style.display = 'none';
    iframe.id = 'dict-iframe';
    document.body.appendChild(iframe);

    // 当iframe加载完成后，可以通过它来查询词典
    iframe.onload = function () {
        console.log('词典资源加载完成');

        // 向iframe发送消息，告知主窗口已准备就绪
        if (iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'INIT' }, '*');
        }
    };

    // 监听来自iframe的消息
    window.addEventListener('message', function (event) {
        if (event.origin === window.location.origin) {
            console.log('收到来自iframe的消息:', event.data);
        }
    });
}

// 开始练习
function startPractice() {
    // 获取当前内容类型的文章列表
    const articles = contentData[currentContentType].articles;

    if (articles.length === 0) {
        alert('当前分类下没有练习文章');
        return;
    }

    // 重置状态
    currentArticle = articles[currentArticleIndex];
    currentIndex = 0;
    startTime = Date.now();
    correctCount = 0;
    totalCount = 0;
    loadedLines = MAX_LINES_PER_LOAD; // 初始加载10个段落
    loadedInputLines = 0; // 重置已加载的输入框行数
    lastSpokenChar = ''; // 重置朗读记录

    // 显示练习区域，隐藏文章选择区域
    articleSelection.style.display = 'none';
    practiceArea.style.display = 'block';

    // 显示统计详情，隐藏统计占位符
    statPlaceholder.style.display = 'none';
    statDetails.style.display = 'flex';

    // 更新文本显示
    updateTextDisplay();

    // 更新汉字信息
    if (currentArticle && currentArticle.content) {
        const firstChar = currentArticle.content.trim().charAt(0);
        if (firstChar) {
            updateCharInfoForChar(firstChar);
            // 朗读第一个字符
            speakNextChar(firstChar);
        }
    }

    // 开始计时
    startTimer();

    // 重置统计信息
    updateStats();
}

// 重置练习
function resetPractice() {
    // 停止计时
    stopTimer();

    // 停止朗读
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
    }

    // 重置状态
    currentArticle = null;
    currentIndex = 0;
    currentLineIndex = 0;
    currentArticleIndex = 0;
    currentReadArticle = null;
    currentReadPage = 0;
    startTime = null;
    correctCount = 0;
    totalCount = 0;
    inputBoxes = [];
    inputContents = {};
    loadedLines = 0;
    loadedInputLines = 0;

    // 显示文章选择区域，隐藏练习和阅读区域
    articleSelection.style.display = 'block';
    practiceArea.style.display = 'none';
    const readArea = document.getElementById('read-area');
    if (readArea) {
        readArea.style.display = 'none';
    }

    // 显示统计占位符，隐藏统计详情
    statPlaceholder.style.display = 'flex';
    statDetails.style.display = 'none';

    // 清空输入框（现在使用动态生成的line-input）

    // 重置汉字信息
    currentCharElement.textContent = '请';
    pinyinElement.textContent = 'qǐng';
    definitionElement.textContent = '请求；邀请；聘请；敬辞';
    phrasesElement.textContent = '';

    // 重置统计信息
    charCountElement.textContent = '0';
    accuracyElement.textContent = '0%';
    timeElapsedElement.textContent = '0s';

    // 重新显示当前分类的文章列表
    displayArticleList(currentContentType);
}

// 计算所有输入框行
function calculateAllInputLines() {
    const content = currentArticle.content;
    // 按换行符分割内容为多行并过滤空行
    const paragraphs = content.split(/\n/).filter(line => line.trim() !== '');
    const allLines = [];

    // 计算所有输入框行
    paragraphs.forEach((paragraph, paragraphIndex) => {
        // 处理长段落，根据长度自动换行
        const maxCharsPerLine = 30; // 每行最大字符数
        const lines = [];

        if (paragraph.length <= maxCharsPerLine) {
            // 段落长度适中，直接作为一行
            lines.push(paragraph);
        } else {
            // 长段落，需要自动换行
            let currentLine = '';
            let charCount = 0;

            for (let i = 0; i < paragraph.length; i++) {
                const char = paragraph[i];
                currentLine += char;
                charCount++;

                // 达到最大字符数或遇到标点符号时换行
                if (charCount >= maxCharsPerLine || (char === '。' || char === '！' || char === '？' || char === '；' || char === '，') && charCount > maxCharsPerLine * 0.7) {
                    lines.push(currentLine);
                    currentLine = '';
                    charCount = 0;
                }
            }

            // 处理剩余字符
            if (currentLine.trim() !== '') {
                lines.push(currentLine);
            }
        }

        // 为每行创建行ID
        lines.forEach((line, lineIndex) => {
            allLines.push({
                lineId: `${paragraphIndex}-${lineIndex}`,
                content: line
            });
        });
    });

    return allLines;
}

// 更新文本显示
function updateTextDisplay() {
    const allLines = calculateAllInputLines();
    const totalLines = allLines.length;

    // 计算当前页的起始和结束行
    const pageSize = 10;
    const currentPage = Math.floor(loadedInputLines / pageSize);
    const startLine = currentPage * pageSize;
    const endLine = Math.min(startLine + pageSize, totalLines);
    const linesToLoad = allLines.slice(startLine, endLine);

    // 生成HTML
    let displayHtml = '';
    linesToLoad.forEach((lineObj, relativeIndex) => {
        const absoluteIndex = startLine + relativeIndex;
        const lineId = lineObj.lineId;
        const line = lineObj.content;
        // 获取该行的存储输入内容
        const savedContent = inputContents[lineId] || '';
        // 转义HTML特殊字符，确保value属性正确
        const escapedContent = savedContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
        
        displayHtml += `<div class="line-container">
            <!-- 文字显示行 -->
            <div class="text-line" id="line-${lineId}">`;
        
        // 为该行的每个字符创建显示
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            // 初始创建时不添加拼音，由updateLineDisplay在需要时添加
            displayHtml += `<span>${char}</span>`;
        }
        
        displayHtml += `</div>
            <input type="text" class="line-input" data-line-index="${lineId}" placeholder="请输入上方文字" value="${escapedContent}">
        </div>`;
    });

    // 替换内容
    currentLine.innerHTML = displayHtml;

    // 获取所有输入框并添加事件监听器
    const lineInputs = document.querySelectorAll('.line-input');
    inputBoxes = [];
    lineInputs.forEach((input, index) => {
        inputBoxes.push(input);
        input.addEventListener('input', function () {
            handleLineInput(index);
        });
        input.addEventListener('keydown', handleKeyDown);
        input.addEventListener('focus', function () {
            // 当输入框获得焦点时，显示当前行的第一个汉字信息
            handleLineFocus(index);
        });
    });

    // 聚焦到第一个输入框
    if (inputBoxes.length > 0) {
        inputBoxes[0].focus();
    }

    // 更新上下页按钮状态
    updatePracticePageButtons(totalLines);
}

// 更新练习页面的上下页按钮状态
function updatePracticePageButtons(totalLines) {
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    const pageSize = 10;
    const totalPages = Math.ceil(totalLines / pageSize);
    const currentPage = Math.floor(loadedInputLines / pageSize);

    if (prevPageBtn) {
        prevPageBtn.disabled = currentPage <= 0;
    }

    if (nextPageBtn) {
        nextPageBtn.disabled = currentPage >= totalPages - 1;
    }
}

// 加载更多行
function loadMoreLines() {
    const content = currentArticle.content;
    const paragraphs = content.split(/\n/).filter(line => line.trim() !== '');

    // 计算当前已加载的最大段落数
    const currentLoaded = loadedLines;
    const totalParagraphs = paragraphs.length;

    if (currentLoaded < totalParagraphs) {
        // 计算新的加载范围，每次最多加载10个段落
        const endLine = Math.min(currentLoaded + MAX_LINES_PER_LOAD, totalParagraphs);

        // 更新已加载行数
        loadedLines = endLine;

        // 重置朗读记录，确保新行的第一个字符能够被正确朗读
        lastSpokenChar = '';

        // 重新调用updateTextDisplay加载更多内容
        updateTextDisplay();
    }
}

// 处理输入
function handleInput() {
    // 兼容旧的输入处理，现在主要使用handleLineInput
}

// 处理输入框获得焦点
function handleLineFocus(lineIndex) {
    // 获取当前输入框的输入内容
    const input = inputBoxes[lineIndex].value;

    // 获取当前输入框对应的行ID
    const lineId = inputBoxes[lineIndex].dataset.lineIndex;

    // 从行ID中解析出段落索引和行索引
    const [paragraphIndex, lineIndexInParagraph] = lineId.split('-').map(Number);

    // 获取原始内容
    const content = currentArticle.content;
    // 按换行符分割内容为多行并过滤空行
    const paragraphs = content.split(/\n/).filter(line => line.trim() !== '');

    if (paragraphIndex < paragraphs.length) {
        // 获取对应段落
        const paragraph = paragraphs[paragraphIndex];

        // 重新计算该行的内容，与updateTextDisplay函数中的逻辑一致
        const maxCharsPerLine = 30;
        let lines = [];

        if (paragraph.length <= maxCharsPerLine) {
            lines.push(paragraph);
        } else {
            let currentLine = '';
            let charCount = 0;

            for (let i = 0; i < paragraph.length; i++) {
                const char = paragraph[i];
                currentLine += char;
                charCount++;

                if (charCount >= maxCharsPerLine || (char === '。' || char === '！' || char === '？' || char === '；' || char === '，') && charCount > maxCharsPerLine * 0.7) {
                    lines.push(currentLine);
                    currentLine = '';
                    charCount = 0;
                }
            }

            if (currentLine.trim() !== '') {
                lines.push(currentLine);
            }
        }

        if (lineIndexInParagraph < lines.length) {
            // 获取当前行的原始内容
            const currentLine = lines[lineIndexInParagraph];
            // 获取去除前后空格的内容用于比较
            const trimmedLine = currentLine.trim();

            // 计算正确匹配的字符数
            let correctMatchCount = 0;
            for (let i = 0; i < input.length && i < trimmedLine.length; i++) {
                if (input[i] === trimmedLine[i]) {
                    correctMatchCount++;
                } else {
                    // 遇到不匹配的字符就停止计数
                    break;
                }
            }

            // 更新行显示，显示拼音
            updateLineDisplay(lineIndex);

            // 显示下一个待输入字的信息
            updateLineCharInfo(lineIndex, correctMatchCount);
            return;
        }
    }

    // 如果找不到行元素，更新行显示并显示当前行的第一个字的信息
    updateLineDisplay(lineIndex);
    updateLineCharInfo(lineIndex, 0);
}

// 处理行输入
function handleLineInput(lineIndex) {
    const input = inputBoxes[lineIndex].value;
    const content = currentArticle.content;

    // 获取当前输入框对应的行ID
    const lineId = inputBoxes[lineIndex].dataset.lineIndex;

    // 保存该行的输入内容
    inputContents[lineId] = input;

    // 从行ID中解析出段落索引和行索引
    const [paragraphIndex, lineIndexInParagraph] = lineId.split('-').map(Number);

    // 按换行符分割内容为多行并过滤空行
    const paragraphs = content.split(/\n/).filter(line => line.trim() !== '');

    if (paragraphIndex >= paragraphs.length) return;

    // 获取对应段落
    const paragraph = paragraphs[paragraphIndex];

    // 重新计算该行的内容，与updateTextDisplay函数中的逻辑一致
    const maxCharsPerLine = 30;
    let lines = [];

    if (paragraph.length <= maxCharsPerLine) {
        lines.push(paragraph);
    } else {
        let currentLine = '';
        let charCount = 0;

        for (let i = 0; i < paragraph.length; i++) {
            const char = paragraph[i];
            currentLine += char;
            charCount++;

            if (charCount >= maxCharsPerLine || (char === '。' || char === '！' || char === '？' || char === '；' || char === '，') && charCount > maxCharsPerLine * 0.7) {
                lines.push(currentLine);
                currentLine = '';
                charCount = 0;
            }
        }

        if (currentLine.trim() !== '') {
            lines.push(currentLine);
        }
    }

    if (lineIndexInParagraph >= lines.length) return;

    // 获取当前行的原始内容
    const currentLine = lines[lineIndexInParagraph];
    // 获取去除前后空格的内容用于比较
    const trimmedLine = currentLine.trim();

    // 移除输入长度限制，允许输入行长度大于对应行
    // 保留此注释以说明修改


    // 更新当前行的显示
    updateLineDisplay(lineIndex);

    // 计算正确匹配的字符数，用于确定要显示的汉字信息
    let correctMatchCount = 0;
    for (let i = 0; i < input.length && i < trimmedLine.length; i++) {
        if (input[i] === trimmedLine[i]) {
            correctMatchCount++;
        } else {
            // 遇到不匹配的字符就停止计数
            break;
        }
    }

    // 更新汉字信息，使用正确匹配的字符数而不是输入长度
    updateLineCharInfo(lineIndex, correctMatchCount);

    // 更新统计信息
    updateStats();

    // 检查是否完成当前行（基于去除空格后的内容长度）
    if (input.length >= trimmedLine.length) {
        // 检查所有字符是否都匹配
        let isAllMatch = true;
        for (let i = 0; i < trimmedLine.length; i++) {
            if (input[i] !== trimmedLine[i]) {
                isAllMatch = false;
                break;
            }
        }

        // 只有当所有字符都匹配时，才跳转到下一行
        if (isAllMatch) {
            // 自动聚焦到下一行
            if (lineIndex < inputBoxes.length - 1) {
                // 使用setTimeout延迟跳转到下一行，确保当前输入事件完全处理完毕
                setTimeout(() => {
                    inputBoxes[lineIndex + 1].focus();
                }, 50);
            } else {
                // 最后一行匹配完成，检查是否还有下一页
                const allLines = calculateAllInputLines();
                const totalLines = allLines.length;
                const pageSize = 10;
                const currentPage = Math.floor(loadedInputLines / pageSize);
                const totalPages = Math.ceil(totalLines / pageSize);

                if (currentPage < totalPages - 1) {
                    // 切换到下一页
                    // 先清除所有输入框的焦点，防止继续输入
                    document.activeElement.blur();

                    // 使用setTimeout延迟切换页面，确保当前输入事件完全处理完毕
                    setTimeout(() => {
                        loadedInputLines += pageSize;
                        updateTextDisplay();
                    }, 100);
                } else {
                    // 所有内容都已完成
                    finishPractice();
                }
            }
        }
    }

    // 当用户输入到倒数第二行时，预加载更多内容
    if (inputBoxes.length - lineIndex === 2) {
        if (loadedLines < paragraphs.length) {
            // 预加载更多内容
            loadMoreLines();
        }
    }
}

// 更新行显示
function updateLineDisplay(lineIndex) {
    const input = inputBoxes[lineIndex].value;

    // 获取当前输入框对应的行ID
    const lineId = inputBoxes[lineIndex].dataset.lineIndex;
    const lineElement = document.getElementById(`line-${lineId}`);

    if (!lineElement) return;

    // 从行ID中解析出段落索引和行索引
    const [paragraphIndex, lineIndexInParagraph] = lineId.split('-').map(Number);

    // 获取原始内容
    const content = currentArticle.content;
    // 按换行符分割内容为多行并过滤空行
    const paragraphs = content.split(/\n/).filter(line => line.trim() !== '');

    if (paragraphIndex >= paragraphs.length) return;

    // 获取对应段落
    const paragraph = paragraphs[paragraphIndex];

    // 重新计算该行的内容，与updateTextDisplay函数中的逻辑一致
    const maxCharsPerLine = 30;
    let lines = [];

    if (paragraph.length <= maxCharsPerLine) {
        lines.push(paragraph);
    } else {
        let currentLine = '';
        let charCount = 0;

        for (let i = 0; i < paragraph.length; i++) {
            const char = paragraph[i];
            currentLine += char;
            charCount++;

            if (charCount >= maxCharsPerLine || (char === '。' || char === '！' || char === '？' || char === '；' || char === '，') && charCount > maxCharsPerLine * 0.7) {
                lines.push(currentLine);
                currentLine = '';
                charCount = 0;
            }
        }

        if (currentLine.trim() !== '') {
            lines.push(currentLine);
        }
    }

    if (lineIndexInParagraph >= lines.length) return;

    // 获取当前行的原始内容
    const currentLine = lines[lineIndexInParagraph];
    // 获取去除前后空格的内容用于比较
    const trimmedLine = currentLine.trim();

    // 计算正确匹配的字符数
    let correctMatchCount = 0;
    for (let i = 0; i < input.length && i < trimmedLine.length; i++) {
        if (input[i] === trimmedLine[i]) {
            correctMatchCount++;
        } else {
            // 遇到不匹配的字符就停止计数
            break;
        }
    }

    let displayHtml = '';
    // 处理行前空格，保持显示但不参与输入比较
    const leadingSpaces = currentLine.match(/^\s*/)[0];
    if (leadingSpaces) {
        displayHtml += `<span>${leadingSpaces}</span>`;
    }

    // 处理实际内容
    for (let i = 0; i < trimmedLine.length; i++) {
        const char = trimmedLine[i];
        let pinyin = '';

        // 获取字符的拼音
        if (/[\u4e00-\u9fa5]/.test(char)) {
            const charData = window.queryDict(char);
            if (charData && charData.pinyin) {
                if (Array.isArray(charData.pinyin)) {
                    pinyin = charData.pinyin[0];
                } else {
                    pinyin = charData.pinyin;
                }
            }
        }

        if (i < correctMatchCount) {
            // 已正确匹配的字符，不显示拼音
            displayHtml += `<span class="correct">${char}</span>`;
        } else if (i === correctMatchCount) {
            // 下一个需要输入的字符，添加背景色、高亮样式和拼音
            // 检查是否为深色主题
            const isDarkTheme = document.body.classList.contains('dark-theme');
            const bgColor = isDarkTheme ? 'rgba(24, 144, 255, 0.1)' : '#f0f7ff';
            const textColor = isDarkTheme ? '#1890ff' : '#0066cc';

            if (pinyin) {
                displayHtml += `<div class="char-pinyin-container">
                    <div class="char-pinyin">${pinyin}</div>
                    <span style="background-color: ${bgColor}; color: ${textColor}; font-size: 1.2em; font-weight: 600;">${char}</span>
                </div>`;
            } else {
                displayHtml += `<span style="background-color: ${bgColor}; color: ${textColor}; font-size: 1.2em; font-weight: 600;">${char}</span>`;
            }

            // 朗读下一个需要输入的中文字符
            speakNextChar(char);
        } else {
            // 其他未输入的字符，不显示拼音
            displayHtml += `<span>${char}</span>`;
        }
    }

    // 处理行后空格，保持显示但不参与输入比较
    const trailingSpaces = currentLine.match(/\s*$/)[0];
    if (trailingSpaces) {
        displayHtml += `<span>${trailingSpaces}</span>`;
    }

    lineElement.innerHTML = displayHtml;
}

// 更新行汉字信息
function updateLineCharInfo(lineIndex, charIndex) {
    if (lineIndex >= inputBoxes.length) {
        // 所有行都完成了
        currentCharElement.textContent = '';
        pinyinElement.textContent = '';
        definitionElement.textContent = '';
        phrasesElement.textContent = '';
        return;
    }

    // 获取当前输入框对应的行ID
    const lineId = inputBoxes[lineIndex].dataset.lineIndex;

    // 从行ID中解析出段落索引和行索引
    const [paragraphIndex, lineIndexInParagraph] = lineId.split('-').map(Number);

    // 获取原始内容
    const content = currentArticle.content;
    // 按换行符分割内容为多行并过滤空行
    const paragraphs = content.split(/\n/).filter(line => line.trim() !== '');

    if (paragraphIndex >= paragraphs.length) {
        // 找不到段落，检查是否有下一行
        if (lineIndex < inputBoxes.length - 1) {
            updateLineCharInfo(lineIndex + 1, 0);
        } else {
            // 所有行都完成了
            currentCharElement.textContent = '';
            pinyinElement.textContent = '';
            definitionElement.textContent = '';
            phrasesElement.textContent = '';
        }
        return;
    }

    // 获取对应段落
    const paragraph = paragraphs[paragraphIndex];

    // 重新计算该行的内容，与updateTextDisplay函数中的逻辑一致
    const maxCharsPerLine = 30;
    let lines = [];

    if (paragraph.length <= maxCharsPerLine) {
        lines.push(paragraph);
    } else {
        let currentLine = '';
        let charCount = 0;

        for (let i = 0; i < paragraph.length; i++) {
            const char = paragraph[i];
            currentLine += char;
            charCount++;

            if (charCount >= maxCharsPerLine || (char === '。' || char === '！' || char === '？' || char === '；' || char === '，') && charCount > maxCharsPerLine * 0.7) {
                lines.push(currentLine);
                currentLine = '';
                charCount = 0;
            }
        }

        if (currentLine.trim() !== '') {
            lines.push(currentLine);
        }
    }

    if (lineIndexInParagraph >= lines.length) {
        // 找不到行，检查是否有下一行
        if (lineIndex < inputBoxes.length - 1) {
            updateLineCharInfo(lineIndex + 1, 0);
        } else {
            // 所有行都完成了
            currentCharElement.textContent = '';
            pinyinElement.textContent = '';
            definitionElement.textContent = '';
            phrasesElement.textContent = '';
        }
        return;
    }

    // 获取当前行的原始内容
    const currentLine = lines[lineIndexInParagraph];
    // 获取去除前后空格的内容用于比较
    const trimmedLine = currentLine.trim();

    if (charIndex >= trimmedLine.length) {
        // 当前行完成了，显示下一行的第一个非空格字符
        if (lineIndex < inputBoxes.length - 1) {
            updateLineCharInfo(lineIndex + 1, 0);
        } else {
            // 所有行都完成了
            currentCharElement.textContent = '';
            pinyinElement.textContent = '';
            definitionElement.textContent = '';
            phrasesElement.textContent = '';
        }
        return;
    }

    // 获取当前字符（考虑去除前后空格的情况）
    const currentChar = trimmedLine[charIndex];
    updateCharInfoForChar(currentChar);
}

// 根据字符更新汉字信息
function updateCharInfoForChar(char) {
    // 使用全局查询函数查询字典
    const charData = window.queryDict(char);

    if (charData) {
        // 更新汉字
        currentCharElement.textContent = char;

        // 构建拼音和基本信息
        let pinyinHtml = '';
        if (Array.isArray(charData.pinyin)) {
            // 多音字分行显示
            charData.pinyin.forEach((pinyin, index) => {
                pinyinHtml += pinyin;
                if (index < charData.pinyin.length - 1) {
                    pinyinHtml += '\n';
                }
            });
        } else {
            pinyinHtml = charData.pinyin;
        }

        // 添加笔画数和部首
        if (charData.strokes || charData.radicals) {
            pinyinHtml += '\n';
            if (charData.strokes) {
                pinyinHtml += `笔画: ${charData.strokes}`;
            }
            if (charData.radicals) {
                if (charData.strokes) pinyinHtml += '\n';
                pinyinHtml += `部首: ${charData.radicals}`;
            }
        }

        pinyinElement.innerHTML = pinyinHtml;

        // 更新字义
        let definitionHtml = '';
        if (charData.definition) {
            if (Array.isArray(charData.definition)) {
                charData.definition.forEach((def, index) => {
                    // 格式化包含"本义"的部分
                    let formattedDef = def.replace(/本义(\s*)([^\n]+)/, '本义：$2');
                    // 删除"同本义："等重复内容
                    formattedDef = formattedDef.replace(/同本义：?/, '');
                    // 确保本义部分单独作为一段，上下有空行
                    formattedDef = formattedDef.replace(/(本义：[^\n]+)([\s\S]*)/, '\n$1\n\n$2');
                    // 移除首尾空格
                    formattedDef = formattedDef.trim();
                    if (formattedDef) {
                        definitionHtml += formattedDef;
                        if (index < charData.definition.length - 1) {
                            definitionHtml += '\n';
                        }
                    }
                });
            } else {
                // 处理完整的解释信息，确保分行显示
                let processedDefinition = charData.definition;
                // 格式化包含"本义"的部分
                processedDefinition = processedDefinition.replace(/本义(\s*)([^\n]+)/, '本义：$2');
                // 删除"同本义："等重复内容
                processedDefinition = processedDefinition.replace(/同本义：?/, '');
                // 确保本义部分单独作为一段，上下有空行
                processedDefinition = processedDefinition.replace(/(本义：[^\n]+)([\s\S]*)/, '\n$1\n\n$2');

                const defLines = processedDefinition.split('\n');
                const validDefLines = defLines.filter(line => line.trim() !== '');
                if (validDefLines.length > 0) {
                    // 只显示前几行核心解释
                    definitionHtml = validDefLines.slice(0, 3).join('\n');
                } else {
                    definitionHtml = processedDefinition.trim();
                }
            }
        }
        definitionElement.textContent = definitionHtml;

        // 构建详细信息对象，用于传递给查看更多页面
        const detailedInfo = {
            char: char,
            pinyin: charData.pinyin,
            strokes: charData.strokes,
            radicals: charData.radicals,
            oldword: charData.oldword,
            definition: charData.definition,
            explanation: charData.explanation,
            more: charData.more
        };

        // 直接显示查看更多链接，不显示其他信息
        phrasesElement.innerHTML = '<a href="#" id="view-more" style="color: #1890ff; text-decoration: underline; cursor: pointer;">查看更多</a>';

        // 添加查看更多点击事件
        document.getElementById('view-more').onclick = function (e) {
            e.preventDefault();
            // 将详细信息存储到localStorage
            localStorage.setItem('charDetail', JSON.stringify(detailedInfo));
            // 跳转到详细信息页面
            window.open('char_detail.html', '_blank');
        };
    } else {
        // 字典中没有该字的信息
        currentCharElement.textContent = char;
        pinyinElement.textContent = '';
        definitionElement.textContent = '';
        phrasesElement.textContent = '';
    }
}

// 检查是否所有行都完成了
function isAllLinesCompleted() {
    for (let i = 0; i < inputBoxes.length; i++) {
        // 获取当前输入框对应的行ID
        const lineId = inputBoxes[i].dataset.lineIndex;
        const lineElement = document.getElementById(`line-${lineId}`);

        if (!lineElement) return false;

        // 获取当前行的实际文本内容（去除HTML标签）
        const currentLine = lineElement.textContent;
        // 获取去除前后空格的内容用于比较
        const trimmedLine = currentLine.trim();

        if (inputBoxes[i].value.length < trimmedLine.length) return false;
    }

    return true;
}

// 检查是否所有已加载的行都完成了
function isAllLoadedLinesCompleted() {
    for (let i = 0; i < inputBoxes.length; i++) {
        // 获取当前输入框对应的行ID
        const lineId = inputBoxes[i].dataset.lineIndex;
        const lineElement = document.getElementById(`line-${lineId}`);

        if (!lineElement) return false;

        // 获取当前行的实际文本内容（去除HTML标签）
        const currentLine = lineElement.textContent;
        // 获取去除前后空格的内容用于比较
        const trimmedLine = currentLine.trim();

        if (inputBoxes[i].value.length < trimmedLine.length) return false;
    }

    return true;
}

// 显示文章列表
function displayArticleList(category) {
    const articles = contentData[category].articles;
    articleItems.innerHTML = '';

    if (articles.length === 0) {
        articleItems.innerHTML = '<div class="article-item">暂无文章</div>';
        return;
    }

    articles.forEach((article, index) => {
        const articleItem = document.createElement('div');
        articleItem.className = `article-item ${index === currentArticleIndex ? 'active' : ''}`;
        articleItem.textContent = article.title;
        articleItem.dataset.index = index;

        articleItem.addEventListener('click', function () {
            // 移除所有文章项的active类
            document.querySelectorAll('.article-item').forEach(item => {
                item.classList.remove('active');
            });
            // 添加当前文章项的active类
            this.classList.add('active');
            // 更新当前文章索引
            currentArticleIndex = parseInt(this.dataset.index);
        });

        articleItems.appendChild(articleItem);
    });
}

// 更新阅读界面显示
function updateReadDisplay() {
    if (!currentReadArticle) return;

    const content = currentReadArticle.content;
    const startIndex = currentReadPage * READ_PAGE_SIZE;
    const endIndex = Math.min((currentReadPage + 1) * READ_PAGE_SIZE, content.length);
    const pageContent = content.substring(startIndex, endIndex);

    // 将内容分割成段落，每段不超过100个字符
    const paragraphs = [];
    let currentParagraph = '';

    for (let i = 0; i < pageContent.length; i++) {
        currentParagraph += pageContent[i];

        // 当遇到句号、感叹号或问号时，且段落长度超过50个字符，分割段落
        if ((pageContent[i] === '。' || pageContent[i] === '！' || pageContent[i] === '？') && currentParagraph.length > 50) {
            paragraphs.push(currentParagraph);
            currentParagraph = '';
        }
    }

    // 添加最后一个段落
    if (currentParagraph.trim() !== '') {
        paragraphs.push(currentParagraph);
    }

    // 生成HTML
    let displayHtml = '';
    paragraphs.forEach(paragraph => {
        if (paragraph.trim() !== '') {
            displayHtml += `<p>${paragraph}</p>`;
        }
    });

    // 更新阅读内容
    const readContent = document.getElementById('read-content');
    if (readContent) {
        readContent.innerHTML = displayHtml;
    }

    // 更新上一页和下一页按钮的状态
    const readPrevBtn = document.getElementById('read-prev-btn');
    const readNextBtn = document.getElementById('read-next-btn');

    if (readPrevBtn) {
        readPrevBtn.disabled = currentReadPage === 0;
    }

    if (readNextBtn) {
        readNextBtn.disabled = (currentReadPage + 1) * READ_PAGE_SIZE >= content.length;
    }

    // 自动朗读当前页内容
    speakReadContent(pageContent);
}

// 朗读阅读页面内容
function speakReadContent(content, isUserSelection = false) {
    // 检查浏览器是否支持Web Speech API
    if ('speechSynthesis' in window) {
        // 停止当前正在播放的语音
        speechSynthesis.cancel();

        // 创建语音实例
        const utterance = new SpeechSynthesisUtterance(content);
        // 设置语音属性
        utterance.lang = 'zh-CN';
        utterance.rate = 0.9; // 语速适中
        utterance.pitch = 1; // 音调
        utterance.volume = 1; // 音量

        // 添加朗读结束事件监听器，自动切换到下一页
        utterance.onend = function () {
            // 检查是否还有下一页
            if (currentReadArticle) {
                const content = currentReadArticle.content;
                if ((currentReadPage + 1) * READ_PAGE_SIZE < content.length) {
                    // 切换到下一页
                    currentReadPage++;
                    updateReadDisplay();
                }
            }
        };

        // 开始朗读
        speechSynthesis.speak(utterance);
    }
}

// 处理键盘事件
function handleKeyDown(e) {
    // 允许空格键输入
    // 移除禁止空格键默认行为的代码

    // 处理F1和F2键，实现上下页功能
    if (e.key === 'F1') {
        e.preventDefault();
        // 上一页逻辑
        const pageSize = 10;
        if (loadedInputLines >= pageSize) {
            loadedInputLines -= pageSize;
            updateTextDisplay();
        }
    } else if (e.key === 'F2') {
        e.preventDefault();
        // 下一页逻辑
        const allLines = calculateAllInputLines();
        const totalLines = allLines.length;
        const pageSize = 10;
        if (loadedInputLines + pageSize < totalLines) {
            loadedInputLines += pageSize;
            updateTextDisplay();
        }
    }

    // 处理上下箭头键
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const inputBoxes = document.querySelectorAll('.line-input');
        const currentInput = e.target;
        let currentIndex = Array.from(inputBoxes).indexOf(currentInput);

        if (e.key === 'ArrowUp' && currentIndex > 0) {
            // 上箭头键，聚焦到上一行
            inputBoxes[currentIndex - 1].focus();
        } else if (e.key === 'ArrowDown' && currentIndex < inputBoxes.length - 1) {
            // 下箭头键，聚焦到下一行
            inputBoxes[currentIndex + 1].focus();
        }
    }
}

// 更新汉字信息
function updateCharInfo() {
    const content = currentArticle.content;
    if (currentIndex >= content.length) {
        // 练习完成，清空汉字信息
        currentCharElement.textContent = '';
        pinyinElement.textContent = '';
        definitionElement.textContent = '';
        phrasesElement.textContent = '';
        return;
    }

    const currentChar = content[currentIndex];
    // 使用全局查询函数查询字典
    const charData = window.queryDict(currentChar);

    if (charData) {
        // 更新汉字
        currentCharElement.textContent = currentChar;

        // 更新拼音
        if (Array.isArray(charData.pinyin)) {
            pinyinElement.textContent = charData.pinyin.join(' / ');
        } else {
            pinyinElement.textContent = charData.pinyin;
        }

        // 更新字义
        if (Array.isArray(charData.definition)) {
            definitionElement.textContent = charData.definition.join(' / ');
        } else {
            definitionElement.textContent = charData.definition;
        }

        // 更新词组
        if (Array.isArray(charData.phrases)) {
            if (Array.isArray(charData.phrases[0])) {
                // 多音字的词组
                let phrasesHtml = '';
                charData.phrases.forEach((phrases, index) => {
                    if (phrases.length > 0) {
                        phrasesHtml += phrases.join('、');
                        if (index < charData.phrases.length - 1) {
                            phrasesHtml += ' / ';
                        }
                    }
                });
                phrasesElement.innerHTML = phrasesHtml;
            } else {
                // 单音字的词组
                phrasesElement.textContent = charData.phrases.join('、');
            }
        } else {
            phrasesElement.textContent = '';
        }
    } else {
        // 字典中没有该字的信息
        currentCharElement.textContent = currentChar;
        pinyinElement.textContent = '';
        definitionElement.textContent = '';
        phrasesElement.textContent = '';
    }
}

// 开始计时
function startTimer() {
    timer = setInterval(() => {
        updateStats();
    }, 1000);
}

// 停止计时
function stopTimer() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

// 格式化时间函数
function formatTime(seconds) {
    if (seconds < 60) {
        return `${seconds}s`;
    } else if (seconds < 3600) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}分${secs}秒`;
    } else if (seconds < 86400) {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours}时${mins}分${secs}秒`;
    } else if (seconds < 31536000) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${days}天${hours}时${mins}分${secs}秒`;
    } else {
        const years = Math.floor(seconds / 31536000);
        const days = Math.floor((seconds % 31536000) / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${years}年${days}天${hours}时${mins}分${secs}秒`;
    }
}

// 更新统计信息
function updateStats() {
    if (!currentArticle) return;

    // 计算正确字数和总字数
    correctCount = 0;
    totalCount = 0;

    for (let i = 0; i < inputBoxes.length; i++) {
        const input = inputBoxes[i].value;

        // 获取当前输入框对应的行ID
        const lineId = inputBoxes[i].dataset.lineIndex;
        const lineElement = document.getElementById(`line-${lineId}`);

        if (!lineElement) continue;

        // 获取当前行的实际文本内容（去除HTML标签）
        const currentLine = lineElement.textContent;
        // 获取去除前后空格的内容用于比较
        const trimmedLine = currentLine.trim();

        totalCount += input.length;

        for (let j = 0; j < input.length; j++) {
            if (j < trimmedLine.length && input[j] === trimmedLine[j]) {
                correctCount++;
            }
        }
    }

    // 计算正确率
    const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    // 计算用时
    const timeElapsed = Math.floor((Date.now() - startTime) / 1000);

    // 更新统计信息显示
    charCountElement.textContent = totalCount;
    accuracyElement.textContent = `${accuracy}%`;
    timeElapsedElement.textContent = formatTime(timeElapsed);
}

// 完成练习
function finishPractice() {
    stopTimer();
    alert('练习完成！');

    // 重置状态
    currentArticle = null;
    currentIndex = 0;
    startTime = null;
    correctCount = 0;
    totalCount = 0;
    loadedLines = 0;

    // 显示文章选择区域，隐藏练习区域
    articleSelection.style.display = 'block';
    practiceArea.style.display = 'none';
}

// 记录上一次朗读的字符，避免重复朗读
let lastSpokenChar = '';

// 朗读下一个需要输入的中文字符
function speakNextChar(char, forceSpeak = false) {
    // 检查是否为中文字符
    if (/[\u4e00-\u9fa5]/.test(char)) {
        // 检查是否与上一次朗读的字符相同，避免重复朗读
        // 但如果是强制朗读，则忽略这个检查
        if (forceSpeak || char !== lastSpokenChar) {
            // 检查浏览器是否支持Web Speech API
            if ('speechSynthesis' in window) {
                // 停止当前正在播放的语音
                speechSynthesis.cancel();

                // 创建语音实例
                const utterance = new SpeechSynthesisUtterance(char);
                // 设置语音属性
                utterance.lang = 'zh-CN';
                utterance.rate = 0.8; // 语速稍慢，便于用户听清
                utterance.pitch = 1; // 音调
                utterance.volume = 1; // 音量

                // 开始朗读
                speechSynthesis.speak(utterance);

                // 记录本次朗读的字符
                lastSpokenChar = char;
            }
        }
    }
}



// 初始化
init();
