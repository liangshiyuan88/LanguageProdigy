// ===== 全局状态管理 =====
let state = {
    score: 0,
    essaysDone: [],
    readingsDone: [],
    wordGamesCount: 0,
    redeemedRewards: [],
    currentTopic: null,
    currentPassage: null,
    currentWordGame: 'idiom',
    writingStartTime: null,
    writingTimer: null,
    currentLevel: '初级'
};

// ===== 初始化 =====
function init() {
    loadState();
    updateScoreDisplay();
    updateHomeStats();
    showPage('home');
}

function loadState() {
    const saved = localStorage.getItem('chineseGame_state');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state = { ...state, ...parsed };
            // currentTopic/currentPassage 保存的是旧结构数据，不恢复，始终从数组中重新查找
            state.currentTopic = null;
            state.currentPassage = null;
            if (!state.currentLevel) state.currentLevel = '初级';
        } catch(e) {}
    }
}

function saveState() {
    localStorage.setItem('chineseGame_state', JSON.stringify(state));
}

function addScore(points, message) {
    state.score += points;
    saveState();
    updateScoreDisplay();
    updateHomeStats();
    if (message) {
        showFloatText('+' + points + ' ⭐');
        showToast(message);
    }
    checkBadges();
}

function updateScoreDisplay() {
    document.getElementById('topScore').textContent = state.score;
}

function updateHomeStats() {
    document.getElementById('homeScore').textContent = state.score;
    document.getElementById('homeEssays').textContent = state.essaysDone.length;
    document.getElementById('homeReadings').textContent = state.readingsDone.length;
    document.getElementById('homeWordGames').textContent = state.wordGamesCount;
}

// ===== 页面切换 =====
function showPage(pageName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + pageName).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navEl = document.getElementById('nav-' + pageName);
    if (navEl) navEl.classList.add('active');

    if (pageName === 'writing') renderWritingPage();
    if (pageName === 'reading') renderReadingPage();
    if (pageName === 'words') renderWordsPage();
    if (pageName === 'rewards') renderRewardsPage();
    if (pageName === 'home') updateHomeStats();
}

// ===== 飘字动画 =====
function showFloatText(text) {
    const container = document.getElementById('float-container');
    const el = document.createElement('div');
    el.className = 'float-text';
    el.textContent = text;
    el.style.left = (50 + Math.random() * 20 - 10) + '%';
    el.style.top = '40%';
    container.appendChild(el);
    setTimeout(() => el.remove(), 1500);
}

function showToast(message) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
}

// ===== 作文训练模块（7步引导式） =====
const writingSteps = ['读题审题', '学范文', '列提纲', '学词语', '分段写', '检查修改', '完成评分'];
const writingStepIcons = ['📖', '📝', '🗂️', '💎', '✏️', '🔍', '🎉'];

let writingState = {
    step: 0,
    outlineAnswers: {},
    sectionDrafts: [],
    comprehensionAnswered: 0,
    comprehensionCorrect: 0,
    startTime: null,
    timer: null
};

function renderWritingPage() {
    const container = document.getElementById('page-writing');

    if (state.currentTopic) {
        renderWritingStep(container);
    } else {
        const levels = ['初级', '中级', '高级'];
        const levelEmojis = { '初级': '🌱', '中级': '⭐', '高级': '🏆' };
        let html = '<h2 class="section-title">✏️ 作文训练</h2>';
        html += '<p style="color:#666;margin-bottom:16px;font-size:15px;">选一个题目开始吧！我们会一步一步引导你写出好作文~ 🎯</p>';
        // 分级标签
        html += '<div class="level-tabs">';
        levels.forEach(lv => {
            const count = essayTopics.filter(t => t.level === lv).length;
            const active = state.currentLevel === lv ? 'active' : '';
            html += `<div class="level-tab ${active}" onclick="switchLevel('${lv}')">${levelEmojis[lv]} ${lv}<span class="level-count">${count}</span></div>`;
        });
        html += '</div>';
        // 题目列表
        const filtered = essayTopics.filter(t => t.level === state.currentLevel);
        html += `<div class="topic-list">`;
        filtered.forEach(topic => {
            const done = state.essaysDone.includes(topic.id);
            html += `
                <div class="topic-card" onclick="selectTopic(${topic.id})">
                    <h3>${topic.title} ${done ? '✅' : ''}</h3>
                    <p>${topic.tag}</p>
                    <span class="topic-tag">${done ? '已完成' : '未完成'}</span>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }
}

function switchLevel(level) {
    state.currentLevel = level;
    renderWritingPage();
}

function selectTopic(id) {
    state.currentTopic = essayTopics.find(t => t.id === id);
    writingState = {
        step: 0,
        outlineAnswers: {},
        sectionDrafts: new Array(state.currentTopic.sectionPrompts.length).fill(''),
        comprehensionAnswered: 0,
        comprehensionCorrect: 0,
        startTime: null,
        timer: null
    };
    renderWritingPage();
}

function renderWritingStep(container) {
    const topic = state.currentTopic;
    const step = writingState.step;

    // 步骤进度条
    let html = `
        <h2 class="section-title">✏️ ${topic.title}</h2>
        <div class="step-progress">
    `;
    writingSteps.forEach((s, i) => {
        const status = i < step ? 'done' : (i === step ? 'active' : '');
        const icon = i < step ? '✅' : writingStepIcons[i];
        html += `<div class="step-dot ${status}"><span class="step-num">${icon}</span><span class="step-label">${s}</span></div>`;
        if (i < writingSteps.length - 1) html += '<div class="step-line"></div>';
    });
    html += '</div>';

    // 步骤内容
    html += '<div class="step-content" id="stepContent">';

    if (step === 0) html += renderStep1Understanding(topic);
    else if (step === 1) html += renderStep2Example(topic);
    else if (step === 2) html += renderStep3Outline(topic);
    else if (step === 3) html += renderStep4WordBank(topic);
    else if (step === 4) html += renderStep5SectionWriting(topic);
    else if (step === 5) html += renderStep6Review(topic);
    else if (step === 6) html += renderStep7Score(topic);

    html += '</div>';

    // 导航按钮
    if (step < 6) {
        html += `
            <div class="step-nav">
                ${step > 0 ? '<button class="btn btn-secondary" onclick="prevStep()">⬅️ 上一步</button>' : '<span></span>'}
                <button class="btn btn-primary" id="nextBtn" onclick="nextStep()">下一步 ➡️</button>
            </div>
        `;
    }

    container.innerHTML = html;

    // 步骤特定的初始化
    if (step === 4) initSectionWriting(topic);
    if (step === 5) initReviewPage(topic);
    if (step === 6) calculateAndShowScore(topic);
}

// --- 第1步：读题审题 ---
function renderStep1Understanding(topic) {
    let html = `
        <div class="step-card">
            <div class="step-card-title">📖 第1步：读题审题</div>
            <div class="understanding-topic">
                <span class="ut-label">作文题目：</span>
                <span class="ut-title">《${topic.title}》</span>
                <span class="ut-tag">${topic.tag}</span>
            </div>
            <div class="understanding-hint">
                💡 先来理解一下题目吧！回答下面的问题，确认你明白了题目要求。
            </div>
    `;

    topic.comprehension.forEach((q, i) => {
        html += `
            <div class="comp-question" id="compQ${i}">
                <div class="comp-q-text">Q${i + 1}：${q.question}</div>
                <ul class="option-list">
        `;
        q.options.forEach((opt, j) => {
            html += `<li onclick="answerComp(${i}, ${j})" data-comp="${i}" data-opt="${j}">${String.fromCharCode(65 + j)}. ${opt}</li>`;
        });
        html += `
                </ul>
                <div class="answer-explain" id="compExplain${i}"><strong>💡 解析：</strong>${q.explain}</div>
            </div>
        `;
    });

    html += '</div>';
    return html;
}

function answerComp(qIdx, optIdx) {
    const q = state.currentTopic.comprehension[qIdx];
    const items = document.querySelectorAll(`#compQ${qIdx} .option-list li`);

    if (items[0].classList.contains('correct') || items[0].classList.contains('wrong')) return;
    items.forEach(li => li.style.pointerEvents = 'none');

    if (optIdx === q.answer) {
        items[optIdx].classList.add('correct');
        writingState.comprehensionCorrect++;
    } else {
        items[optIdx].classList.add('wrong');
        items[q.answer].classList.add('correct');
    }
    document.getElementById('compExplain' + qIdx).classList.add('show');
    writingState.comprehensionAnswered++;

    if (writingState.comprehensionAnswered === state.currentTopic.comprehension.length) {
        if (writingState.comprehensionCorrect === state.currentTopic.comprehension.length) {
            showToast('🎉 全部答对！你对题目理解得很好！');
        } else {
            showToast('💡 没关系，看完解析继续吧！');
        }
    }
}

// --- 第2步：学范文 ---
function renderStep2Example(topic) {
    const paras = topic.example.split('\n\n');
    let html = `
        <div class="step-card">
            <div class="step-card-title">📝 第2步：学范文</div>
            <div class="example-hint">
                💡 仔细阅读下面的范文，注意旁边的小贴士，学习别人是怎么写的！
            </div>
            <div class="example-container">
    `;

    paras.forEach((para, i) => {
        let paraLabel = '';
        if (i === 0) paraLabel = '开头';
        else if (i === paras.length - 1) paraLabel = '结尾';
        else paraLabel = '中间第' + i + '段';

        html += `
            <div class="example-para">
                <div class="example-para-label">${paraLabel}</div>
                <p class="example-para-text">${para}</p>
            </div>
        `;
    });

    html += `
            </div>
            <div class="example-tips">
                <h4>🌟 范文学习小贴士</h4>
                <p>✅ <strong>开头</strong>：简洁明了，交代清楚时间、地点和事件</p>
                <p>✅ <strong>中间</strong>：按顺序写，每段写一件事，有细节描写</p>
                <p>✅ <strong>结尾</strong>：总结感受，点明主题</p>
                <p>✅ <strong>好词好句</strong>：用了比喻、拟人等修辞手法，让文章更生动</p>
            </div>
        </div>
    `;
    return html;
}

// --- 第3步：列提纲 ---
function renderStep3Outline(topic) {
    const outline = topic.outline;
    let html = `
        <div class="step-card">
            <div class="step-card-title">🗂️ 第3步：列提纲</div>
            <div class="outline-hint">
                💡 先想好每段要写什么，填在下面的框里。有了提纲，写作文就不难啦！
            </div>
            <div class="outline-form">
                <div class="outline-section outline-beginning">
                    <div class="outline-label">开头</div>
                    <div class="outline-prompt">${outline.beginning.prompt}</div>
                    <div class="outline-hint-text">💡 ${outline.beginning.hint}</div>
                    <input type="text" class="outline-input" id="outline_0"
                        placeholder="写出你的想法..."
                        value="${writingState.outlineAnswers[0] || ''}"
                        oninput="saveOutline(0, this.value)">
                </div>
    `;

    outline.middle.forEach((m, i) => {
        const idx = i + 1;
        html += `
            <div class="outline-section outline-middle">
                <div class="outline-label">中间第${i + 1}段</div>
                <div class="outline-prompt">${m.prompt}</div>
                <div class="outline-hint-text">💡 ${m.hint}</div>
                <input type="text" class="outline-input" id="outline_${idx}"
                    placeholder="写出你的想法..."
                    value="${writingState.outlineAnswers[idx] || ''}"
                    oninput="saveOutline(${idx}, this.value)">
            </div>
        `;
    });

    const endIdx = outline.middle.length + 1;
    html += `
                <div class="outline-section outline-ending">
                    <div class="outline-label">结尾</div>
                    <div class="outline-prompt">${outline.ending.prompt}</div>
                    <div class="outline-hint-text">💡 ${outline.ending.hint}</div>
                    <input type="text" class="outline-input" id="outline_${endIdx}"
                        placeholder="写出你的想法..."
                        value="${writingState.outlineAnswers[endIdx] || ''}"
                        oninput="saveOutline(${endIdx}, this.value)">
                </div>
            </div>
        </div>
    `;
    return html;
}

function saveOutline(idx, value) {
    writingState.outlineAnswers[idx] = value;
}

// --- 第4步：学词语 ---
function renderStep4WordBank(topic) {
    let html = `
        <div class="step-card">
            <div class="step-card-title">💎 第4步：词语锦囊</div>
            <div class="wordbank-hint">
                💡 这些好词可以用到你的作文里哦！点击词语可以收藏，写作时可以用到。
            </div>
            <div class="wordbank-grid">
    `;

    topic.wordBank.forEach(group => {
        html += `<div class="wordbank-group">
            <div class="wordbank-category">${group.category}</div>
            <div class="wordbank-words">`;
        group.words.forEach(word => {
            html += `<span class="wordbank-chip" onclick="copyWord(this, '${word}')">${word}</span>`;
        });
        html += `</div></div>`;
    });

    html += `
            </div>
            <div class="wordbank-note">
                📌 小提示：写作文时，多用这些好词，你的作文会更生动哦！
            </div>
        </div>
    `;
    return html;
}

function copyWord(el, word) {
    el.classList.toggle('collected');
    if (el.classList.contains('collected')) {
        showToast('已收藏「' + word + '」！写作时记得用哦~ ✨');
    }
}

// --- 第5步：分段写作 ---
function renderStep5SectionWriting(topic) {
    let html = `
        <div class="step-card">
            <div class="step-card-title">✏️ 第5步：分段写作</div>
            <div class="section-writing-hint">
                💡 现在按照提纲，一段一段地写吧！每写完一段可以进入下一段。
            </div>
            <div class="section-tabs">
    `;

    topic.sectionPrompts.forEach((sp, i) => {
        const filled = writingState.sectionDrafts[i] && writingState.sectionDrafts[i].trim().length > 0;
        html += `<div class="section-tab ${i === 0 ? 'active' : ''} ${filled ? 'filled' : ''}"
                    id="secTab${i}" onclick="switchSection(${i})">
                    ${filled ? '✅' : (i + 1)}. ${sp.title}
                 </div>`;
    });

    html += '</div>';
    html += '<div id="sectionEditor"></div>';

    html += `
        <div class="section-progress-bar">
            <span id="sectionProgress">已写 0/${topic.sectionPrompts.length} 段</span>
            <span id="sectionCharCount">总字数：0</span>
        </div>
    `;

    html += '</div>';
    return html;
}

let currentSection = 0;

function initSectionWriting(topic) {
    currentSection = 0;
    showSectionEditor(0);
    updateSectionProgress(topic);
}

function showSectionEditor(idx) {
    const topic = state.currentTopic;
    const sp = topic.sectionPrompts[idx];
    const editor = document.getElementById('sectionEditor');

    // 获取对应的提纲
    const outlineKeys = Object.keys(writingState.outlineAnswers);
    const outlineNote = writingState.outlineAnswers[idx] || '';

    editor.innerHTML = `
        <div class="section-editor-area">
            <div class="section-guide">
                <h4>✏️ ${sp.title}</h4>
                <p>${sp.guidance}</p>
                ${sp.tip ? `<div class="section-tip">${sp.tip}</div>` : ''}
                ${outlineNote ? `<div class="section-outline-ref">📋 你的提纲：${outlineNote}</div>` : ''}
            </div>
            <textarea class="writing-textarea section-textarea" id="sectionInput_${idx}"
                placeholder="${sp.placeholder}"
                oninput="updateSectionDraft(${idx}, this.value)">${writingState.sectionDrafts[idx] || ''}</textarea>
            <div class="section-editor-footer">
                <span class="char-count">本段已写 <span id="sectionChar_${idx}">${(writingState.sectionDrafts[idx] || '').length}</span> 字</span>
                <span class="char-target">目标：至少${sp.minChars}字</span>
            </div>
        </div>
    `;
}

function switchSection(idx) {
    currentSection = idx;
    document.querySelectorAll('.section-tab').forEach((t, i) => {
        t.classList.toggle('active', i === idx);
    });
    showSectionEditor(idx);
}

function updateSectionDraft(idx, value) {
    writingState.sectionDrafts[idx] = value;
    const charEl = document.getElementById('sectionChar_' + idx);
    if (charEl) charEl.textContent = value.length;

    // 更新tab状态
    const tab = document.getElementById('secTab' + idx);
    if (tab) {
        const filled = value.trim().length > 0;
        tab.classList.toggle('filled', filled);
        // 更新文字
        const sp = state.currentTopic.sectionPrompts[idx];
        tab.innerHTML = `${filled ? '✅' : (idx + 1)}. ${sp.title}`;
    }

    updateSectionProgress(state.currentTopic);

    // 开始计时（第一次输入时）
    if (!writingState.startTime && value.trim().length > 0) {
        writingState.startTime = Date.now();
    }
}

function updateSectionProgress(topic) {
    const filled = writingState.sectionDrafts.filter(d => d && d.trim().length > 0).length;
    const totalChars = writingState.sectionDrafts.reduce((sum, d) => sum + (d || '').length, 0);
    const progressEl = document.getElementById('sectionProgress');
    const charEl = document.getElementById('sectionCharCount');
    if (progressEl) progressEl.textContent = `已写 ${filled}/${topic.sectionPrompts.length} 段`;
    if (charEl) charEl.textContent = `总字数：${totalChars}`;
}

// --- 第6步：检查修改 ---
function renderStep6Review(topic) {
    const fullText = writingState.sectionDrafts.filter(d => d && d.trim()).join('\n\n');
    const charCount = fullText.length;
    const paragraphCount = writingState.sectionDrafts.filter(d => d && d.trim()).length;
    const punctCount = (fullText.match(/[，。！？、；：""''（）《》]/g) || []).length;

    let html = `
        <div class="step-card">
            <div class="step-card-title">🔍 第6步：检查修改</div>
            <div class="review-hint">
                💡 仔细读一遍你的作文，对照下面的检查清单，看看有没有需要修改的地方。
            </div>
            <div class="review-essay">
                <h4>📄 我的作文</h4>
                <div class="review-essay-text">
    `;

    if (charCount === 0) {
        html += '<p style="color:#999;text-align:center;">还没有写内容哦，请返回上一步写作文。</p>';
    } else {
        writingState.sectionDrafts.filter(d => d && d.trim()).forEach(para => {
            html += `<p style="text-indent:2em;line-height:2;margin-bottom:12px;">${para}</p>`;
        });
    }

    html += `
                </div>
            </div>
            <div class="review-checklist">
                <h4>✅ 作文检查清单</h4>
                <div class="checklist-item">
                    <span class="check-icon ${charCount >= 200 ? 'pass' : 'fail'}">${charCount >= 200 ? '✅' : '❌'}</span>
                    <span>字数${charCount >= 200 ? '充足' : '偏少'}（当前${charCount}字，建议200字以上）</span>
                </div>
                <div class="checklist-item">
                    <span class="check-icon ${paragraphCount >= 3 ? 'pass' : 'fail'}">${paragraphCount >= 3 ? '✅' : '❌'}</span>
                    <span>分段${paragraphCount >= 3 ? '合理' : '偏少'}（当前${paragraphCount}段，建议3段以上）</span>
                </div>
                <div class="checklist-item">
                    <span class="check-icon ${punctCount >= 5 ? 'pass' : 'fail'}">${punctCount >= 5 ? '✅' : '❌'}</span>
                    <span>标点符号${punctCount >= 5 ? '使用' : '偏少'}（当前${punctCount}个标点）</span>
                </div>
                <div class="checklist-item">
                    <span class="check-icon pass">💡</span>
                    <span>检查每段开头是否空两格（已自动处理）</span>
                </div>
                <div class="checklist-item">
                    <span class="check-icon pass">💡</span>
                    <span>检查有没有错别字和不通顺的句子</span>
                </div>
            </div>
        </div>
    `;
    return html;
}

function initReviewPage(topic) {
    // 如果还没开始计时但已有内容，补上
    if (!writingState.startTime) {
        const hasContent = writingState.sectionDrafts.some(d => d && d.trim().length > 0);
        if (hasContent) writingState.startTime = Date.now();
    }
}

// --- 第7步：完成评分 ---
function renderStep7Score(topic) {
    return '<div id="scoreContainer">正在评分中...</div>';
}

function calculateAndShowScore(topic) {
    const fullText = writingState.sectionDrafts.filter(d => d && d.trim()).join('\n\n');
    const charCount = fullText.length;
    const paragraphs = writingState.sectionDrafts.filter(d => d && d.trim());

    const elapsed = writingState.startTime ? Math.floor((Date.now() - writingState.startTime) / 1000) : 0;
    const minutes = Math.max(1, Math.floor(elapsed / 60));
    const speed = Math.round(charCount / minutes);

    // 评分
    let stars = 1, points = 5;
    if (charCount >= 50) { stars = 1; points = 5; }
    if (charCount >= 150) { stars = 2; points = 10; }
    if (charCount >= 250) { stars = 3; points = 15; }
    if (charCount >= 350) { stars = 4; points = 20; }
    if (charCount >= 450) { stars = 5; points = 25; }

    // 审题加分
    if (writingState.comprehensionCorrect === topic.comprehension.length) {
        points += 2;
    }

    let feedbackParts = [];

    // 字数反馈
    if (charCount < 100) {
        feedbackParts.push('📝 字数有点少，可以多写一些细节，让作文更丰富哦！');
    } else if (charCount < 200) {
        feedbackParts.push('📝 字数还不错，如果能再多写一些就更好了！');
    } else if (charCount < 350) {
        feedbackParts.push('📝 字数很棒，内容比较充实，继续保持！');
    } else {
        feedbackParts.push('📝 字数非常棒，内容很丰富，真厉害！');
    }

    // 分段反馈
    if (paragraphs.length >= 3) {
        feedbackParts.push('✅ 分段很好，有开头、中间和结尾，结构清晰！');
    } else if (paragraphs.length >= 2) {
        feedbackParts.push('💡 建议多分几段，让作文结构更清晰。');
    } else {
        feedbackParts.push('💡 记得要分段哦！开头、中间、结尾分开写。');
    }

    // 标点反馈
    const punctCount = (fullText.match(/[，。！？、；：""''（）《》]/g) || []).length;
    if (punctCount < 5) {
        feedbackParts.push('💡 别忘了加标点符号哦！逗号、句号很重要。');
    } else {
        feedbackParts.push('✅ 标点符号使用得当，很好！');
    }

    // 速度反馈
    if (speed >= 30) {
        feedbackParts.push('⚡ 写作速度很快，真棒！');
    } else if (speed >= 15) {
        feedbackParts.push('⚡ 写作速度还可以，多练习会更快哦！');
    } else {
        feedbackParts.push('⚡ 写作速度可以再快一些，多读多写就能提速！');
    }

    // 审题反馈
    if (writingState.comprehensionCorrect === topic.comprehension.length) {
        feedbackParts.push('🧠 审题全对！你对题目的理解很到位！');
    }

    const feedback = feedbackParts.join('\n');
    const starStr = '⭐'.repeat(stars) + '☆'.repeat(5 - stars);

    const container = document.getElementById('scoreContainer');
    if (!container) return;

    container.innerHTML = `
        <div class="step-card">
            <div class="step-card-title">🎉 第7步：完成评分</div>
            <div class="score-card">
                <h3>🎊 作文完成啦！太棒了！</h3>
                <div class="score-stars">${starStr}</div>
                <div class="score-detail">
                    <div class="score-item">
                        <div class="score-num">${charCount}</div>
                        <div class="score-label">总字数</div>
                    </div>
                    <div class="score-item">
                        <div class="score-num">${paragraphs.length}</div>
                        <div class="score-label">段落数</div>
                    </div>
                    <div class="score-item">
                        <div class="score-num">${minutes}</div>
                        <div class="score-label">用时(分钟)</div>
                    </div>
                    <div class="score-item">
                        <div class="score-num">${speed}</div>
                        <div class="score-label">字/分钟</div>
                    </div>
                </div>
                <div class="score-feedback">${feedback.replace(/\n/g, '<br>')}</div>
                <div class="earned-points">获得 ${points} 积分！⭐</div>
            </div>
            <div class="final-essay-display">
                <h4>📄 我的完整作文</h4>
                <div class="review-essay-text">
                    ${paragraphs.length === 0 ? '<p style="color:#999;text-align:center;">还没有写内容。</p>' :
                        paragraphs.map(p => `<p style="text-indent:2em;line-height:2;margin-bottom:12px;">${p}</p>`).join('')}
                </div>
            </div>
            <div style="text-align:center;margin-top:20px;">
                <button class="btn btn-warning" onclick="showExampleFromScore()">📖 对比范文</button>
                <button class="btn btn-primary" onclick="backToTopicList()">📝 写下一篇</button>
            </div>
            <div id="scoreExampleBox" style="display:none;margin-top:16px;">
                <div class="essay-example">
                    <h4>📚 范文参考</h4>
                    ${topic.example.split('\n\n').map(p => `<p style="text-indent:2em;line-height:2;margin-bottom:12px;">${p}</p>`).join('')}
                </div>
            </div>
        </div>
    `;

    if (!state.essaysDone.includes(topic.id)) {
        state.essaysDone.push(topic.id);
    }
    addScore(points, '作文完成！获得' + points + '积分！');
    container.scrollIntoView({ behavior: 'smooth' });
}

function showExampleFromScore() {
    const box = document.getElementById('scoreExampleBox');
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
}

// --- 步骤导航 ---
function nextStep() {
    const topic = state.currentTopic;
    const step = writingState.step;

    // 步骤验证
    if (step === 0) {
        if (writingState.comprehensionAnswered < topic.comprehension.length) {
            showToast('请先完成所有审题问题哦！💡');
            return;
        }
    }
    if (step === 4) {
        const filledCount = writingState.sectionDrafts.filter(d => d && d.trim().length > 0).length;
        if (filledCount === 0) {
            showToast('请至少写一些内容再进入下一步哦！✏️');
            return;
        }
    }

    writingState.step++;
    renderWritingStep(document.getElementById('page-writing'));
    document.getElementById('page-writing').scrollTop = 0;
}

function prevStep() {
    if (writingState.step > 0) {
        writingState.step--;
        renderWritingStep(document.getElementById('page-writing'));
        document.getElementById('page-writing').scrollTop = 0;
    }
}

function backToTopicList() {
    state.currentTopic = null;
    if (writingState.timer) {
        clearInterval(writingState.timer);
        writingState.timer = null;
    }
    renderWritingPage();
}

// 保留旧函数名兼容
function updateTimer() {}
function toggleExample() {}

// ===== 阅读理解模块 =====
function renderReadingPage() {
    const container = document.getElementById('page-reading');

    if (state.currentPassage) {
        renderReadingExercise(container);
    } else {
        let html = '<h2 class="section-title">📖 阅读理解</h2>';
        html += '<p style="color:#666;margin-bottom:20px;font-size:15px;">选一篇文章来阅读吧！读完后做题，答对就能获得积分~</p>';
        html += '<div class="reading-list">';
        readingPassages.forEach(p => {
            const done = state.readingsDone.includes(p.id);
            html += `
                <div class="reading-card" onclick="selectPassage(${p.id})">
                    <div class="reading-cover" style="background:${p.color};">${p.emoji}</div>
                    <div class="reading-info">
                        <h3>${p.title} ${done ? '✅' : ''}</h3>
                        <p>共${p.questions.length}道题</p>
                        <div class="reading-meta">
                            <span>四年级</span>
                            <span>${done ? '已完成' : '未完成'}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }
}

function selectPassage(id) {
    state.currentPassage = readingPassages.find(p => p.id === id);
    renderReadingPage();
}

function renderReadingExercise(container) {
    const p = state.currentPassage;
    const paragraphs = p.text.split('\n\n').map(para => `<p class="passage-text">${para}</p>`).join('');

    let html = '<h2 class="section-title">📖 阅读理解</h2>';
    html += `<div class="reading-passage"><div class="passage-title">${p.emoji} ${p.title}</div>${paragraphs}</div>`;

    p.questions.forEach((q, qIdx) => {
        html += `<div class="question-block" id="qblock-${qIdx}">`;
        html += `<div class="question-text"><span class="q-num">${qIdx + 1}</span>${q.question}</div>`;

        if (q.type === 'choice') {
            html += '<ul class="option-list">';
            q.options.forEach((opt, optIdx) => {
                html += `<li onclick="selectOption(${qIdx}, ${optIdx})" data-q="${qIdx}" data-opt="${optIdx}">${String.fromCharCode(65 + optIdx)}. ${opt}</li>`;
            });
            html += '</ul>';
        } else if (q.type === 'fill') {
            html += `<input type="text" class="fill-input" id="fill-${qIdx}" placeholder="请输入你的答案..." onkeyup="checkFillEnter(event, ${qIdx})">`;
            html += `<button class="btn btn-primary" style="margin-top:10px;" onclick="submitFill(${qIdx})">确认</button>`;
        }

        html += `<div class="answer-explain" id="explain-${qIdx}"><strong>📝 解析：</strong>${q.explain}</div>`;
        html += '</div>';
    });

    html += `
        <div style="text-align:center;margin-top:24px;">
            <button class="btn btn-secondary" onclick="backToPassageList()">返回文章列表</button>
        </div>
    `;

    container.innerHTML = html;
    container.scrollTop = 0;
}

let readingAnswers = {};

function selectOption(qIdx, optIdx) {
    const q = state.currentPassage.questions[qIdx];
    const items = document.querySelectorAll(`#qblock-${qIdx} .option-list li`);

    // 禁止重复选择
    if (items[0].classList.contains('correct') || items[0].classList.contains('wrong')) return;

    items.forEach(li => li.style.pointerEvents = 'none');

    if (optIdx === q.answer) {
        items[optIdx].classList.add('correct');
        document.getElementById('explain-' + qIdx).classList.add('show');
        addScore(5, '回答正确！+5积分 ⭐');
    } else {
        items[optIdx].classList.add('wrong');
        items[q.answer].classList.add('correct');
        document.getElementById('explain-' + qIdx).classList.add('show');
        showToast('别灰心，看看解析吧！加油！💪');
    }
}

function submitFill(qIdx) {
    const input = document.getElementById('fill-' + qIdx);
    const userAnswer = input.value.trim();
    const q = state.currentPassage.questions[qIdx];

    if (!userAnswer) {
        showToast('请输入答案哦！');
        return;
    }

    input.disabled = true;

    // 模糊匹配：包含关键词即可
    const correct = q.answer;
    const isCorrect = userAnswer.includes(correct) || correct.includes(userAnswer) ||
                      userAnswer.replace(/[\s，。、]/g, '') === correct.replace(/[\s，。、]/g, '');

    if (isCorrect) {
        input.style.borderColor = '#43e97b';
        input.style.background = '#d1fae5';
        document.getElementById('explain-' + qIdx).classList.add('show');
        addScore(5, '回答正确！+5积分 ⭐');
    } else {
        input.style.borderColor = '#f87171';
        input.style.background = '#fee2e2';
        document.getElementById('explain-' + qIdx).classList.add('show');
        showToast('别灰心，看看解析吧！加油！💪');
    }
}

function checkFillEnter(event, qIdx) {
    if (event.key === 'Enter') submitFill(qIdx);
}

function backToPassageList() {
    state.currentPassage = null;
    renderReadingPage();
}

// ===== 词语游戏模块 =====
function renderWordsPage() {
    const container = document.getElementById('page-words');
    let html = `
        <h2 class="section-title">🎯 词语游戏</h2>
        <div class="game-tabs">
            <div class="game-tab ${state.currentWordGame === 'idiom' ? 'active' : ''}" onclick="switchWordGame('idiom')">🔗 成语接龙</div>
            <div class="game-tab ${state.currentWordGame === 'fill' ? 'active' : ''}" onclick="switchWordGame('fill')">📝 词语填空</div>
        </div>
        <div id="wordGameArea"></div>
    `;
    container.innerHTML = html;

    if (state.currentWordGame === 'idiom') {
        renderIdiomGame();
    } else {
        renderFillGame();
    }
}

function switchWordGame(type) {
    state.currentWordGame = type;
    renderWordsPage();
}

// --- 成语接龙 ---
let idiomState = {
    index: 0,
    correctCount: 0,
    totalCount: 0
};

function renderIdiomGame() {
    const area = document.getElementById('wordGameArea');
    idiomState.index = 0;
    idiomState.correctCount = 0;
    idiomState.totalCount = idiomChain.length;

    area.innerHTML = `
        <div class="game-area">
            <p class="game-prompt">🔗 成语接龙！看上方的成语，在输入框写出下一个成语（以提示字开头的成语）</p>
            <div class="game-stats">
                <div class="game-stat">进度: <span id="idiomProgress">0/${idiomState.totalCount}</span></div>
                <div class="game-stat">正确: <span id="idiomCorrect">0</span></div>
            </div>
            <div id="idiomContent"></div>
            <div class="game-result" id="idiomResult"></div>
            <div id="idiomNextBtn" style="display:none;margin-top:16px;">
                <button class="btn btn-success" onclick="nextIdiom()">下一题 ➡️</button>
            </div>
        </div>
    `;
    showIdiomQuestion();
}

function showIdiomQuestion() {
    const content = document.getElementById('idiomContent');
    if (idiomState.index >= idiomState.totalCount) {
        showIdiomFinal();
        return;
    }

    const item = idiomChain[idiomState.index];
    const lastChar = item.idiom.charAt(item.idiom.length - 1);

    content.innerHTML = `
        <p style="font-size:15px;color:#888;margin-bottom:8px;">请写出以「<strong style="color:#f0932b;font-size:20px;">${lastChar}</strong>」字开头的成语：</p>
        <div class="idiom-current">${item.idiom}</div>
        <br>
        <input type="text" class="idiom-input" id="idiomInput" placeholder="输入成语..." onkeyup="checkIdiomEnter(event)">
        <br><br>
        <button class="btn btn-primary" onclick="submitIdiom()">确认 ✅</button>
    `;
    document.getElementById('idiomInput').focus();
    document.getElementById('idiomResult').textContent = '';
    document.getElementById('idiomNextBtn').style.display = 'none';

    document.getElementById('idiomProgress').textContent = `${idiomState.index + 1}/${idiomState.totalCount}`;
    document.getElementById('idiomCorrect').textContent = idiomState.correctCount;
}

function submitIdiom() {
    const input = document.getElementById('idiomInput');
    const userAnswer = input.value.trim();
    const item = idiomChain[idiomState.index];
    const result = document.getElementById('idiomResult');
    const nextBtn = document.getElementById('idiomNextBtn');

    if (!userAnswer) {
        showToast('请输入成语！');
        return;
    }

    input.disabled = true;

    // 判断：以最后一个字开头，且是4个字
    const lastChar = item.idiom.charAt(item.idiom.length - 1);
    const startsCorrect = userAnswer.charAt(0) === lastChar;
    const isCorrectIdiom = userAnswer === item.next;
    const isFourChars = userAnswer.length === 4;

    if (isCorrectIdiom) {
        result.innerHTML = '<span style="color:#43e97b;">✅ 太棒了！完全正确！</span>';
        result.innerHTML += `<br><span style="font-size:14px;color:#888;">${item.idiom} → ${item.next}</span>`;
        idiomState.correctCount++;
        addScore(3, '成语接龙正确！+3积分 ⭐');
    } else if (startsCorrect && isFourChars) {
        result.innerHTML = `<span style="color:#f9ca24;">🤔 你写的「${userAnswer}」以「${lastChar}」开头，格式正确！</span>`;
        result.innerHTML += `<br><span style="font-size:14px;color:#888;">参考答案：${item.next}</span>`;
        addScore(1, '格式正确！+1积分 ⭐');
    } else {
        result.innerHTML = `<span style="color:#f87171;">❌ 要以「${lastChar}」字开头的四字成语哦！</span>`;
        result.innerHTML += `<br><span style="font-size:14px;color:#888;">参考答案：${item.next}</span>`;
        showToast('没关系，记住这个成语就好！💪');
    }

    nextBtn.style.display = 'block';
}

function checkIdiomEnter(event) {
    if (event.key === 'Enter') submitIdiom();
}

function nextIdiom() {
    idiomState.index++;
    showIdiomQuestion();
}

function showIdiomFinal() {
    const content = document.getElementById('idiomContent');
    const result = document.getElementById('idiomResult');
    const nextBtn = document.getElementById('idiomNextBtn');
    const accuracy = Math.round((idiomState.correctCount / idiomState.totalCount) * 100);

    let praise = '';
    if (accuracy >= 80) praise = '🏆 成语大师！你太厉害了！';
    else if (accuracy >= 60) praise = '👍 很不错！继续加油！';
    else if (accuracy >= 40) praise = '💪 还可以，多练习会更好！';
    else praise = '📖 别灰心，多读书多积累成语！';

    content.innerHTML = `
        <div style="font-size:48px;margin-bottom:16px;">🎉</div>
        <h3 style="font-size:24px;color:#f0932b;margin-bottom:12px;">游戏结束！</h3>
        <div class="game-stats">
            <div class="game-stat">正确: <span>${idiomState.correctCount}/${idiomState.totalCount}</span></div>
            <div class="game-stat">正确率: <span>${accuracy}%</span></div>
        </div>
        <p style="font-size:18px;color:#555;margin-top:12px;">${praise}</p>
    `;
    result.textContent = '';
    nextBtn.style.display = 'none';

    state.wordGamesCount++;
    saveState();
    checkBadges();

    setTimeout(() => {
        content.innerHTML += `<br><button class="btn btn-primary" onclick="renderIdiomGame()">🔄 再玩一次</button>`;
    }, 500);
}

// --- 词语填空 ---
let fillState = {
    index: 0,
    correctCount: 0,
    currentAnswer: '',
    options: [],
    selectedOption: null
};

function renderFillGame() {
    const area = document.getElementById('wordGameArea');
    fillState.index = 0;
    fillState.correctCount = 0;

    area.innerHTML = `
        <div class="game-area">
            <p class="game-prompt">📝 词语填空！选出正确的字填入句子中的空格</p>
            <div class="game-stats">
                <div class="game-stat">进度: <span id="fillProgress">1/${wordFillQuestions.length}</span></div>
                <div class="game-stat">正确: <span id="fillCorrect">0</span></div>
            </div>
            <div id="fillContent"></div>
            <div class="game-result" id="fillResult"></div>
            <div id="fillNextBtn" style="display:none;margin-top:16px;">
                <button class="btn btn-success" onclick="nextFill()">下一题 ➡️</button>
            </div>
        </div>
    `;
    showFillQuestion();
}

function showFillQuestion() {
    const content = document.getElementById('fillContent');
    if (fillState.index >= wordFillQuestions.length) {
        showFillFinal();
        return;
    }

    const q = wordFillQuestions[fillState.index];
    const parts = q.sentence.split('___');
    fillState.currentAnswer = q.answer;

    // 随机打乱选项
    fillState.options = [...q.options].sort(() => Math.random() - 0.5);
    fillState.selectedOption = null;

    let optionsHtml = '';
    fillState.options.forEach((opt, i) => {
        optionsHtml += `<div class="word-option" onclick="selectFillOption(${i})" id="fillOpt-${i}">${opt}</div>`;
    });

    content.innerHTML = `
        <div class="word-blank" id="fillBlank">
            ${parts[0]}<span class="blank" id="fillBlankChar">？</span>${parts[1]}
        </div>
        <p style="color:#888;font-size:14px;margin-bottom:12px;">点击下方选择正确的字：</p>
        <div class="word-options">${optionsHtml}</div>
        <button class="btn btn-primary" id="fillConfirmBtn" onclick="submitFillAnswer()" disabled>确认 ✅</button>
    `;

    document.getElementById('fillResult').textContent = '';
    document.getElementById('fillNextBtn').style.display = 'none';
    document.getElementById('fillProgress').textContent = `${fillState.index + 1}/${wordFillQuestions.length}`;
    document.getElementById('fillCorrect').textContent = fillState.correctCount;
}

function selectFillOption(i) {
    fillState.selectedOption = i;
    document.querySelectorAll('.word-option').forEach(el => {
        el.style.background = '#fef3c7';
        el.style.borderColor = '#f9ca24';
    });
    const el = document.getElementById('fillOpt-' + i);
    el.style.background = '#fde68a';
    el.style.borderColor = '#f0932b';

    // 实时填入空格
    document.getElementById('fillBlankChar').textContent = fillState.options[i];

    document.getElementById('fillConfirmBtn').disabled = false;
}

function submitFillAnswer() {
    if (fillState.selectedOption === null) return;

    const selected = fillState.options[fillState.selectedOption];
    const result = document.getElementById('fillResult');
    const nextBtn = document.getElementById('fillNextBtn');

    document.querySelectorAll('.word-option').forEach(el => el.style.pointerEvents = 'none');
    document.getElementById('fillConfirmBtn').disabled = true;

    if (selected === fillState.currentAnswer) {
        document.getElementById('fillOpt-' + fillState.selectedOption).style.background = '#d1fae5';
        document.getElementById('fillOpt-' + fillState.selectedOption).style.borderColor = '#43e97b';
        result.innerHTML = '<span style="color:#43e97b;">✅ 正确！</span>';
        fillState.correctCount++;
        addScore(3, '词语填空正确！+3积分 ⭐');
    } else {
        document.getElementById('fillOpt-' + fillState.selectedOption).style.background = '#fee2e2';
        document.getElementById('fillOpt-' + fillState.selectedOption).style.borderColor = '#f87171';
        // 标出正确答案
        fillState.options.forEach((opt, i) => {
            if (opt === fillState.currentAnswer) {
                document.getElementById('fillOpt-' + i).style.background = '#d1fae5';
                document.getElementById('fillOpt-' + i).style.borderColor = '#43e97b';
            }
        });
        result.innerHTML = `<span style="color:#f87171;">❌ 正确答案是「${fillState.currentAnswer}」</span>`;
        showToast('没关系，记住这个字就好！💪');
    }

    nextBtn.style.display = 'block';
}

function nextFill() {
    fillState.index++;
    showFillQuestion();
}

function showFillFinal() {
    const content = document.getElementById('fillContent');
    const result = document.getElementById('fillResult');
    const nextBtn = document.getElementById('fillNextBtn');
    const accuracy = Math.round((fillState.correctCount / wordFillQuestions.length) * 100);

    let praise = '';
    if (accuracy >= 80) praise = '🏆 词语达人！太厉害了！';
    else if (accuracy >= 60) praise = '👍 很不错！继续加油！';
    else if (accuracy >= 40) praise = '💪 还可以，多练习会更好！';
    else praise = '📖 别灰心，多读多写积累词语！';

    content.innerHTML = `
        <div style="font-size:48px;margin-bottom:16px;">🎉</div>
        <h3 style="font-size:24px;color:#f0932b;margin-bottom:12px;">游戏结束！</h3>
        <div class="game-stats">
            <div class="game-stat">正确: <span>${fillState.correctCount}/${wordFillQuestions.length}</span></div>
            <div class="game-stat">正确率: <span>${accuracy}%</span></div>
        </div>
        <p style="font-size:18px;color:#555;margin-top:12px;">${praise}</p>
    `;
    result.textContent = '';
    nextBtn.style.display = 'none';

    state.wordGamesCount++;
    saveState();
    checkBadges();

    setTimeout(() => {
        content.innerHTML += `<br><button class="btn btn-primary" onclick="renderFillGame()">🔄 再玩一次</button>`;
    }, 500);
}

// ===== 积分奖励模块 =====
function renderRewardsPage() {
    const container = document.getElementById('page-rewards');

    let html = `
        <h2 class="section-title">🏆 积分奖励</h2>
        <div class="rewards-overview">
            <div class="rewards-total">⭐ ${state.score}</div>
            <div class="rewards-label">我的总积分</div>
        </div>
        <h3 style="font-size:18px;margin-bottom:16px;color:#333;">🎁 积分兑换</h3>
        <div class="rewards-grid">
    `;

    rewards.forEach(r => {
        const redeemed = state.redeemedRewards.includes(r.id);
        const canAfford = state.score >= r.cost;
        html += `
            <div class="reward-card ${redeemed ? 'redeemed' : ''}">
                <div class="reward-icon">${r.icon}</div>
                <div class="reward-name">${r.name}</div>
                <div class="reward-cost">需要 <span>${r.cost}</span> ⭐</div>
                ${redeemed ? '<button class="btn btn-secondary" disabled>已兑换</button>' :
                  `<button class="btn ${canAfford ? 'btn-success' : 'btn-secondary'}" ${canAfford ? '' : 'disabled'} onclick="redeemReward(${r.id})">${canAfford ? '兑换' : '积分不足'}</button>`}
            </div>
        `;
    });

    html += '</div>';

    // 徽章区域
    html += '<div class="badge-section">';
    html += '<h3 style="font-size:18px;margin-bottom:16px;color:#333;">🏅 我的徽章</h3>';
    html += '<div class="badge-grid">';

    badges.forEach(b => {
        const earned = isBadgeEarned(b);
        html += `
            <div class="badge ${earned ? '' : 'locked'}">
                <div class="badge-icon">${b.icon}</div>
                <div class="badge-name">${b.name.replace(/\n/g, '<br>')}</div>
                ${earned ? '<div style="font-size:11px;color:#43e97b;margin-top:4px;">✅ 已获得</div>' : '<div style="font-size:11px;color:#aaa;margin-top:4px;">🔒 未解锁</div>'}
            </div>
        `;
    });

    html += '</div></div>';

    // 重置按钮
    html += `
        <div style="text-align:center;margin-top:32px;">
            <button class="btn btn-secondary" onclick="resetProgress()">🔄 重置所有进度</button>
        </div>
    `;

    container.innerHTML = html;
}

function redeemReward(id) {
    const reward = rewards.find(r => r.id === id);
    if (state.score < reward.cost) {
        showToast('积分不足哦，继续努力！');
        return;
    }

    state.score -= reward.cost;
    state.redeemedRewards.push(id);
    saveState();
    updateScoreDisplay();
    updateHomeStats();

    showToast(`🎉 兑换成功！去找爸爸妈妈领取「${reward.name}」吧！`);
    renderRewardsPage();
}

function isBadgeEarned(badge) {
    const c = badge.condition;
    if (c.type === 'essays') return state.essaysDone.length >= c.count;
    if (c.type === 'readings') return state.readingsDone.length >= c.count;
    if (c.type === 'wordGames') return state.wordGamesCount >= c.count;
    if (c.type === 'score') return state.score >= c.count;
    return false;
}

function checkBadges() {
    badges.forEach(b => {
        if (isBadgeEarned(b)) {
            const key = 'badge_' + b.id;
            if (!localStorage.getItem(key)) {
                localStorage.setItem(key, '1');
                const name = b.name.split('\n')[0];
                showToast(`🏅 获得新徽章：${name}！`);
            }
        }
    });
}

function resetProgress() {
    if (!confirm('确定要重置所有进度吗？所有积分和记录都会清空哦！')) return;
    state = {
        score: 0,
        essaysDone: [],
        readingsDone: [],
        wordGamesCount: 0,
        redeemedRewards: [],
        currentTopic: null,
        currentPassage: null,
        currentWordGame: 'idiom',
        writingStartTime: null,
        writingTimer: null,
        currentLevel: '初级'
    };
    localStorage.removeItem('chineseGame_state');
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('badge_')) localStorage.removeItem(key);
    });
    updateScoreDisplay();
    updateHomeStats();
    showPage('home');
    showToast('已重置所有进度，重新开始吧！');
}

// ===== 启动 =====
window.addEventListener('DOMContentLoaded', init);
