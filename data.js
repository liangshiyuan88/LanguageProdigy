// ===== 作文题目数据 =====
// essayTopics 在 topics_all.js 中定义

// ===== 阅读理解数据 =====
// readingPassages 在 readings_all.js 中定义

// ===== 成语接龙 + 词语填空数据 =====
// idiomChain 和 wordFillQuestions 在 words_all.js 中定义

// ===== 奖励数据 =====
const rewards = [
    { id: 1, icon: "🍦", name: "一个冰淇淋", cost: 50 },
    { id: 2, icon: "🎮", name: "玩30分钟游戏", cost: 80 },
    { id: 3, icon: "📚", name: "一本新故事书", cost: 120 },
    { id: 4, icon: "🏀", name: "去公园玩1小时", cost: 100 },
    { id: 5, icon: "🍫", name: "一块巧克力", cost: 40 },
    { id: 6, icon: "🎬", name: "看一部电影", cost: 150 },
    { id: 7, icon: "🎁", name: "一个神秘礼物", cost: 200 },
    { id: 8, icon: "🍕", name: "吃一次披萨", cost: 130 },
    { id: 9, icon: "🏊", name: "去游泳一次", cost: 160 },
    { id: 10, icon: "🚲", name: "骑自行车1小时", cost: 90 }
];

// ===== 徽章数据 =====
const badges = [
    { id: 1, icon: "✏️", name: "初出茅庐\n完成第1篇作文", condition: { type: "essays", count: 1 } },
    { id: 2, icon: "📝", name: "小作家\n完成5篇作文", condition: { type: "essays", count: 5 } },
    { id: 3, icon: "📖", name: "阅读新星\n完成1篇阅读", condition: { type: "readings", count: 1 } },
    { id: 4, icon: "📚", name: "阅读达人\n完成5篇阅读", condition: { type: "readings", count: 5 } },
    { id: 5, icon: "🎯", name: "词语新手\n完成1次词语游戏", condition: { type: "wordGames", count: 1 } },
    { id: 6, icon: "🏆", name: "词语大师\n完成10次词语游戏", condition: { type: "wordGames", count: 10 } },
    { id: 7, icon: "⭐", name: "积分手\n获得100积分", condition: { type: "score", count: 100 } },
    { id: 8, icon: "🌟", name: "学霸之星\n获得500积分", condition: { type: "score", count: 500 } }
];
