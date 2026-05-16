const chars = [{name:'アンドロイド',ability:'hacker'},{name:'騎士',ability:'steady'},{name:'サキュバス',ability:'drain'}];
let playerChar, cpuChar, isMoving = false, pos = {player:0, cpu:0}, hp = {player:100, cpu:100}, traps = Array(28).fill(null), trapLevel = Array(28).fill(0), specialStock = {player:false, cpu:false}, logHistory = [];

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    if (type === 'roll') { osc.type = 'square'; osc.frequency.setValueAtTime(200, audioCtx.currentTime); gain.gain.setValueAtTime(0.02, audioCtx.currentTime); osc.start(); osc.stop(audioCtx.currentTime + 0.05); }
    else if (type === 'stop') { osc.type = 'sine'; osc.frequency.setValueAtTime(400, audioCtx.currentTime); gain.gain.setValueAtTime(0.05, audioCtx.currentTime); osc.start(); osc.stop(audioCtx.currentTime + 0.2); }
    else if (type === 'move') { osc.type = 'triangle'; osc.frequency.setValueAtTime(600, audioCtx.currentTime); gain.gain.setValueAtTime(0.03, audioCtx.currentTime); osc.start(); osc.stop(audioCtx.currentTime + 0.1); }
}

function showScreen(id) { ['title-screen', 'how-to', 'setup', 'game'].forEach(s => { document.getElementById(s).style.display = (s === id ? 'flex' : 'none'); if(id==='game'&&s==='game') document.getElementById(s).style.display = 'block'; }); }
function selectChar(i) { playerChar = chars[i]; cpuChar = chars.filter((_, idx) => idx !== i)[Math.floor(Math.random()*2)]; document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected')); document.getElementById(`char-${i}`).classList.add('selected'); document.getElementById('start-btn').disabled = false; }
function startGame() { showScreen('game'); initBoard(); }

function initBoard() {
    const b = document.getElementById('board'); b.innerHTML = '';
    for (let i = 0; i < 28; i++) {
        const c = document.createElement('div'); c.className = 'cell'; c.id = `cell-${i}`;
        if (i === 0) { c.classList.add('start'); c.innerText = "START"; }
        else if (i % 7 === 0) { c.classList.add('special-spot'); c.innerText = "SP"; }
        else { c.innerText = i; }
        let x, y;
        if (i < 8) { x = i + 1; y = 1; } else if (i < 14) { x = 8; y = (i - 8) + 2; } else if (i < 22) { x = 8 - (i - 14); y = 8; } else { x = 1; y = 8 - (i - 21); }
        c.style.gridColumn = x; c.style.gridRow = y; b.appendChild(c);
    }
    updateDisplay();
}

function updateLog(msg, typeClass) {
    const msgEl = document.getElementById('message');
    msgEl.innerText = msg; msgEl.className = typeClass;
    logHistory.unshift({ text: msg, type: typeClass });
    if (logHistory.length > 3) logHistory.pop();
    const content = document.getElementById('history-content');
    content.innerHTML = logHistory.map(item => {
        let cls = 'h-system'; if (item.type === 'msg-player') cls = 'h-player'; if (item.type === 'msg-cpu') cls = 'h-cpu';
        return `<div class="history-item ${cls}">${item.text}</div>`;
    }).join('');
}

function toggleHistory() { const el = document.getElementById('log-history'); el.style.display = (el.style.display === 'none') ? 'block' : 'none'; }
function setDiceVisual(num) { document.getElementById('dice-box').innerHTML = `<img src="images/dice${num}.png" class="dice-img">`; }

function updateDisplay() {
    document.querySelectorAll('.p-piece').forEach(p => p.remove());
    ['player', 'cpu'].forEach(who => {
        const p = document.createElement('div'); const cObj = (who === 'player' ? playerChar : cpuChar);
        p.className = `p-piece ${who} char-${chars.indexOf(cObj)}`;
        let flip = (pos[who] > 7 && pos[who] <= 21) ? -1 : 1;
        p.style.transform = `translateX(-50%) scaleX(${flip})`;
        if (pos.player === pos.cpu) p.style.left = (who === 'player') ? "35%" : "65%";
        document.getElementById(`cell-${pos[who]}`).appendChild(p);
    });
    document.getElementById('p-hp').innerText = Math.ceil(hp.player);
    document.getElementById('p-hp-bar').style.width = hp.player + "%";
    document.getElementById('c-hp').innerText = Math.ceil(hp.cpu);
    document.getElementById('c-hp-bar').style.width = hp.cpu + "%";
    document.getElementById('p-special').innerText = specialStock.player ? "★SP READY" : "";
    document.getElementById('c-special').innerText = specialStock.cpu ? "★SP READY" : "";
    traps.forEach((owner, i) => {
        const cell = document.getElementById(`cell-${i}`);
        cell.classList.remove('trap-player', 'trap-cpu', 'lvl-1', 'lvl-2', 'lvl-3');
        if (owner) {
            const lvlVal = trapLevel[i]/20;
            cell.classList.add(`trap-${owner}`, `lvl-${lvlVal}`);
            const lvlDiv = cell.querySelector('.trap-lvl') || document.createElement('div');
            lvlDiv.className = 'trap-lvl'; lvlDiv.innerText = `Lv.${lvlVal}`;
            if (!cell.querySelector('.trap-lvl')) cell.appendChild(lvlDiv);
        }
    });
}

async function handleTurn() { if (isMoving) return; await play('player', playerChar); if (hp.cpu > 0 && hp.player > 0) setTimeout(() => play('cpu', cpuChar), 800); }

async function play(who, char) {
    isMoving = true; const diceBox = document.getElementById('dice-box'); const btn = document.getElementById('dice-btn');
    const opp = (who === 'player' ? 'cpu' : 'player'); const oppChar = (who === 'player' ? cpuChar : playerChar);
    const roleClass = (who === 'player' ? 'msg-player' : 'msg-cpu');
    btn.disabled = true;

    diceBox.classList.add('dice-rolling');
    for(let i=0; i<10; i++) { const temp = Math.floor(Math.random()*6)+1; setDiceVisual(temp); playSound('roll'); await new Promise(r=>setTimeout(r,80)); }
    diceBox.classList.remove('dice-rolling');
    let roll = Math.floor(Math.random()*6)+1; setDiceVisual(roll); playSound('stop');

    let moveLog = `${char.name}: ${roll}マス移動`;
    for (let i = 0; i < roll; i++) {
        pos[who] = (pos[who] + 1) % 28;
        if (pos[who] === 0) { hp[who] = Math.min(100, hp[who] + 20); updateLog("START通過ボーナス回復！", "msg-system"); }
        updateDisplay(); playSound('move');
        const pEl = document.querySelector(`.p-piece.${who}`);
        if(pEl) pEl.style.animation = "walkAnim 0.4s infinite";
        await new Promise(r => setTimeout(r, 400));
        if(pEl) pEl.style.animation = "none";
    }

    const cur = pos[who];
    let resultLog = "";
    if (cur % 7 === 0) {
        if (specialStock[opp] && oppChar.ability === 'drain') { specialStock[opp] = false; updateLog("聖域の力で魅惑を浄化した！", "msg-system"); }
        if (cur === 0) { hp[who] = Math.min(100, hp[who] + 20); resultLog = "＆着地超回復！"; }
        else {
            specialStock[who] = true; resultLog = "＆★SP獲得！";
            if (char.ability === 'hacker') { traps.forEach((o, idx) => { if (o === opp && trapLevel[idx] > 20) trapLevel[idx] -= 20; }); specialStock[who] = false; resultLog = "＆★SP全敵ハック！"; }
        }
        await new Promise(r => setTimeout(r, 800));
    } else if (specialStock[who] && char.ability === 'steady') {
        if (specialStock[opp] && oppChar.ability === 'drain') specialStock[opp] = false;
        traps[cur] = who; trapLevel[cur] = 60; specialStock[who] = false; resultLog = "＆聖域展開(Lv3)！";
    } else if (specialStock[opp] && oppChar.ability === 'drain') {
        specialStock[opp] = false;
        if (!traps[cur]) { traps[cur] = opp; trapLevel[cur] = 20; resultLog = "＆魅惑で罠を献上"; }
        else if (traps[cur] === who) { if (trapLevel[cur] > 20) trapLevel[cur] -= 20; resultLog = "＆魅惑で自陣弱体"; }
        else { 
            if (trapLevel[cur] < 60) trapLevel[cur] += 20;
            let d = trapLevel[cur]; if (char.ability === 'hacker' && d > 20) { d -= 20; trapLevel[cur] = d; }
            if (char.ability === 'steady') d = Math.floor(d / 2);
            hp[who] -= d; hp[opp] = Math.min(100, hp[opp] + Math.floor(d / 4)); resultLog = `＆魅惑強化で${d}ダメ`;
        }
    } else {
        if (!traps[cur]) { traps[cur] = who; trapLevel[cur] = 20; resultLog = "＆罠を設置"; }
        else if (traps[cur] === who) { if (trapLevel[cur] < 60) { trapLevel[cur] += 20; resultLog = "＆罠を強化"; } else { resultLog = "(自陣地)"; } }
        else {
            let lvl = trapLevel[cur]; if (char.ability === 'hacker' && lvl > 20) { lvl -= 20; trapLevel[cur] = lvl; }
            let d = (char.ability === 'steady') ? Math.floor(lvl / 2) : lvl;
            hp[who] -= d; if (oppChar.ability === 'drain') hp[opp] = Math.min(100, hp[opp] + Math.floor(d / 4));
            resultLog = `＆${d}ダメージ！`;
        }
    }
    updateLog(moveLog + " " + resultLog, roleClass);
    updateDisplay();

    // 勝利判定
    if (hp.player <= 0 || hp.cpu <= 0) {
        const isWin = hp.player > 0;
        setTimeout(() => {
            const overlay = document.getElementById('result-overlay');
            document.getElementById('result-text').innerText = isWin ? "VICTORY!" : "DEFEAT...";
            document.getElementById('result-text').style.color = isWin ? "#f1c40f" : "#999";
            document.getElementById('result-detail').innerText = isWin ? 
                `${playerChar.name}が${cpuChar.name}を制圧した！` : 
                `${cpuChar.name}の前に${playerChar.name}は力尽きた...`;
            overlay.style.display = 'flex';
        }, 1200); // 1.2秒の余韻の後に表示
        return;
    }

    isMoving = (who === 'player'); btn.disabled = isMoving;
}
