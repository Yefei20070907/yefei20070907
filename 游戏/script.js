// ========== 游戏状态定义 ==========
const gameState = {
    diskCount: 3,          // 默认圆盘数量
    pegs: [[], [], []],    // 三个柱子，每个柱子用栈（数组）模拟
    moves: 0,              // 步数统计
    isAutoSolving: false,  // 是否正在自动解谜
    selectedPegIndex: null,// 选中的柱子索引（手动移动用）
    moveHistory: []        // 移动历史（可选，用于回退）
};

// ========== DOM 元素获取 ==========
const diskCountInput = document.getElementById('diskCount');
const resetBtn = document.getElementById('resetBtn');
const autoSolveBtn = document.getElementById('autoSolveBtn');
const moveCounter = document.getElementById('moveCounter');
const messageEl = document.getElementById('message');
const pegsEls = document.querySelectorAll('.peg');

// ========== 初始化游戏 ==========
function initGame() {
    // 重置状态
    gameState.diskCount = parseInt(diskCountInput.value);
    gameState.pegs = [[], [], []];
    gameState.moves = 0;
    gameState.isAutoSolving = false;
    gameState.selectedPegIndex = null;
    gameState.moveHistory = [];

    // 校验圆盘数量（3-8个）
    if (gameState.diskCount < 3) gameState.diskCount = 3;
    if (gameState.diskCount > 8) gameState.diskCount = 8;
    diskCountInput.value = gameState.diskCount;

    // 把圆盘放到第一个柱子上（从大到小）
    for (let i = gameState.diskCount; i >= 1; i--) {
        gameState.pegs[0].push(i);
    }

    // 更新页面显示
    renderPegs();
    moveCounter.textContent = gameState.moves;
    messageEl.textContent = "游戏已重置，点击柱子开始！";
}

// ========== 渲染柱子和圆盘 ==========
function renderPegs() {
    pegsEls.forEach((pegEl, index) => {
        pegEl.innerHTML = ''; // 清空当前柱子
        const disks = gameState.pegs[index];
        
        // 从栈底到栈顶渲染圆盘
        disks.forEach((diskSize) => {
            const disk = document.createElement('div');
            disk.className = 'disk';
            disk.style.width = `${diskSize * 30}px`; // 按大小设置宽度
            disk.style.backgroundColor = getDiskColor(diskSize);
            disk.textContent = diskSize; // 显示圆盘数字（可选）
            disk.style.display = 'flex';
            disk.style.alignItems = 'center';
            disk.style.justifyContent = 'center';
            disk.style.color = 'white';
            disk.style.fontWeight = 'bold';
            
            pegEl.appendChild(disk);
        });
    });
}

// ========== 给圆盘分配颜色 ==========
function getDiskColor(size) {
    const colors = [
        '#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', 
        '#5f27cd', '#ff9ff3', '#54a0ff', '#00d2d3'
    ];
    return colors[size - 1] || '#95a5a6';
}

// ========== 手动移动：点击柱子逻辑 ==========
function handlePegClick(pegIndex) {
    // 自动解谜中禁止手动操作
    if (gameState.isAutoSolving) {
        messageEl.textContent = "自动解谜中，无法手动操作！";
        return;
    }

    const clickedPeg = gameState.pegs[pegIndex];

    // 情况1：还没选中任何柱子，点击的是有圆盘的柱子 → 选中
    if (gameState.selectedPegIndex === null) {
        if (clickedPeg.length === 0) {
            messageEl.textContent = "❌ 这个柱子没有圆盘，换一个试试！";
            return;
        }
        // 记录选中状态
        gameState.selectedPegIndex = pegIndex;
        messageEl.textContent = `✅ 已选中第 ${pegIndex + 1} 根柱子的圆盘`;
        // 给选中的圆盘加高亮
        pegsEls[pegIndex].lastElementChild?.classList.add('selected');
    } 
    // 情况2：已经选中了柱子，点击目标柱子 → 尝试移动
    else {
        const fromIndex = gameState.selectedPegIndex;
        const fromPeg = gameState.pegs[fromIndex];
        const movingDisk = fromPeg[fromPeg.length - 1];
        const targetTopDisk = clickedPeg[clickedPeg.length - 1];

        // 规则1：不能移动到同一个柱子
        if (fromIndex === pegIndex) {
            // 取消选中
            gameState.selectedPegIndex = null;
            pegsEls[fromIndex].lastElementChild?.classList.remove('selected');
            messageEl.textContent = "已取消选中";
            return;
        }

        // 规则2：不能把大圆盘放到小圆盘上面
        if (clickedPeg.length > 0 && targetTopDisk < movingDisk) {
            messageEl.textContent = "❌ 不能把大圆盘放到小圆盘上面！";
            return;
        }

        // 执行移动
        fromPeg.pop();
        clickedPeg.push(movingDisk);
        gameState.moves++;
        moveCounter.textContent = gameState.moves;
        messageEl.textContent = `✅ 圆盘 ${movingDisk} 已移动到第 ${pegIndex + 1} 根柱子`;

        // 重置选中状态
        gameState.selectedPegIndex = null;
        pegsEls.forEach(el => el.lastElementChild?.classList.remove('selected'));

        // 更新页面
        renderPegs();

        // 检查是否通关
        checkWin();
    }
}

// ========== 检查是否通关 ==========
function checkWin() {
    const targetPeg1 = gameState.pegs[1];
    const targetPeg2 = gameState.pegs[2];

    if (targetPeg1.length === gameState.diskCount || targetPeg2.length === gameState.diskCount) {
        messageEl.textContent = `🎉 恭喜通关！你用了 ${gameState.moves} 步完成！`;
        gameState.isAutoSolving = false;
    }
}

// ========== 自动解谜：汉诺塔递归算法 ==========
async function autoSolve() {
    if (gameState.isAutoSolving) return;
    gameState.isAutoSolving = true;
    messageEl.textContent = "🤖 自动解谜中...";
    resetBtn.disabled = true;
    autoSolveBtn.disabled = true;

    // 递归移动函数
    async function solve(n, from, to, aux) {
        if (n === 0) return;

        await solve(n - 1, from, aux, to);

        // 延迟，让用户能看清每一步
        await new Promise(resolve => setTimeout(resolve, 600));

        // 执行移动
        const movingDisk = gameState.pegs[from].pop();
        gameState.pegs[to].push(movingDisk);
        gameState.moves++;
        moveCounter.textContent = gameState.moves;
        renderPegs();

        await solve(n - 1, aux, to, from);
    }

    // 从第0根柱子移动到第2根，用第1根做辅助
    await solve(gameState.diskCount, 0, 2, 1);

    // 解谜完成
    gameState.isAutoSolving = false;
    resetBtn.disabled = false;
    autoSolveBtn.disabled = false;
    checkWin();
}

// ========== 绑定事件 ==========
// 柱子点击事件
pegsEls.forEach((pegEl, index) => {
    pegEl.addEventListener('click', () => {
        handlePegClick(index);
    });
});

// 重置按钮
resetBtn.addEventListener('click', initGame);

// 自动解谜按钮
autoSolveBtn.addEventListener('click', autoSolve);

// 圆盘数量变化时重置游戏
diskCountInput.addEventListener('change', initGame);

// ========== 页面加载完成后初始化 ==========
window.addEventListener('DOMContentLoaded', () => {
    initGame();
});