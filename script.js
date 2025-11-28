// ゲーム状態
let gameState = 'title'; // 'title', 'playing', 'gameover'
let score1 = 0;
let score2 = 0;
let player1Alive = true;
let player2Alive = true;
let obstacleSpeed = 3;
let obstacleSpawnRate = 1500;
let gameInterval;
let spawnInterval;

// DOM要素
const titleScreen = document.getElementById('titleScreen');
const gameScreen = document.getElementById('gameScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const titleBtn = document.getElementById('titleBtn');
const player1 = document.getElementById('player1');
const player2 = document.getElementById('player2');
const player1Area = document.getElementById('player1Area');
const player2Area = document.getElementById('player2Area');
const obstacles1Container = document.getElementById('obstacles1');
const obstacles2Container = document.getElementById('obstacles2');
const score1Display = document.getElementById('score1');
const score2Display = document.getElementById('score2');
const finalScore1Display = document.getElementById('finalScore1');
const finalScore2Display = document.getElementById('finalScore2');
const winnerText = document.getElementById('winnerText');

// プレイヤーのジャンプ状態
let player1Jumping = false;
let player2Jumping = false;

// イベントリスナー
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
titleBtn.addEventListener('click', showTitle);

// タッチエリアの設定
player1Area.addEventListener('click', () => {
    if (gameState === 'playing' && player1Alive) {
        jump(1);
    }
});

player2Area.addEventListener('click', () => {
    if (gameState === 'playing' && player2Alive) {
        jump(2);
    }
});

// タッチイベント対応
player1Area.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState === 'playing' && player1Alive) {
        jump(1);
    }
});

player2Area.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState === 'playing' && player2Alive) {
        jump(2);
    }
});

function showTitle() {
    gameState = 'title';
    titleScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
}

function startGame() {
    // ゲーム状態のリセット
    gameState = 'playing';
    score1 = 0;
    score2 = 0;
    player1Alive = true;
    player2Alive = true;
    obstacleSpeed = 3;
    obstacleSpawnRate = 1500;
    
    // 画面の切り替え
    titleScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    gameOverScreen.classList.add('hidden');
    
    // スコア表示の更新
    score1Display.textContent = score1;
    score2Display.textContent = score2;
    
    // 既存の障害物を削除
    obstacles1Container.innerHTML = '';
    obstacles2Container.innerHTML = '';
    
    // ゲームループの開始
    clearInterval(gameInterval);
    clearInterval(spawnInterval);
    
    gameInterval = setInterval(gameLoop, 20);
    spawnInterval = setInterval(spawnObstacle, obstacleSpawnRate);
}

function jump(playerNum) {
    if (playerNum === 1 && !player1Jumping) {
        player1Jumping = true;
        player1.classList.add('jumping');
        
        setTimeout(() => {
            player1.classList.remove('jumping');
            player1Jumping = false;
        }, 500);
    } else if (playerNum === 2 && !player2Jumping) {
        player2Jumping = true;
        player2.classList.add('jumping');
        
        setTimeout(() => {
            player2.classList.remove('jumping');
            player2Jumping = false;
        }, 500);
    }
}

function spawnObstacle() {
    if (gameState !== 'playing') return;
    
    // プレイヤー1の障害物
    if (player1Alive && Math.random() > 0.3) {
        const obstacle = document.createElement('div');
        obstacle.className = 'obstacle obstacle1';
        obstacle.style.right = '-30px';
        obstacles1Container.appendChild(obstacle);
    }
    
    // プレイヤー2の障害物
    if (player2Alive && Math.random() > 0.3) {
        const obstacle = document.createElement('div');
        obstacle.className = 'obstacle obstacle2';
        obstacle.style.right = '-30px';
        obstacles2Container.appendChild(obstacle);
    }
}

function gameLoop() {
    if (gameState !== 'playing') return;
    
    // 障害物の移動とチェック
    moveObstacles(obstacles1Container, 1);
    moveObstacles(obstacles2Container, 2);
    
    // スコアの更新
    score1Display.textContent = score1;
    score2Display.textContent = score2;
    
    // 難易度の上昇
    if (score1 + score2 > 0 && (score1 + score2) % 10 === 0) {
        obstacleSpeed += 0.01;
    }
    
    // ゲームオーバーチェック
    if (!player1Alive && !player2Alive) {
        endGame();
    } else if (!player1Alive) {
        // プレイヤー1が負けた場合、プレイヤー2の障害物を止める
        if (obstacles2Container.children.length === 0) {
            endGame();
        }
    } else if (!player2Alive) {
        // プレイヤー2が負けた場合、プレイヤー1の障害物を止める
        if (obstacles1Container.children.length === 0) {
            endGame();
        }
    }
}

function moveObstacles(container, playerNum) {
    const obstacles = Array.from(container.children);
    const playerAlive = playerNum === 1 ? player1Alive : player2Alive;
    
    if (!playerAlive) return;
    
    obstacles.forEach(obstacle => {
        const currentRight = parseInt(obstacle.style.right) || 0;
        obstacle.style.right = (currentRight + obstacleSpeed) + 'px';
        
        // 画面外に出たら削除してスコア加算
        if (currentRight > window.innerWidth) {
            obstacle.remove();
            if (playerNum === 1 && player1Alive) {
                score1++;
            } else if (playerNum === 2 && player2Alive) {
                score2++;
            }
        }
        
        // 衝突判定
        if (checkCollision(obstacle, playerNum)) {
            if (playerNum === 1) {
                player1Alive = false;
                player1.style.opacity = '0.3';
                clearInterval(spawnInterval); // 障害物の生成を停止
            } else {
                player2Alive = false;
                player2.style.opacity = '0.3';
                clearInterval(spawnInterval); // 障害物の生成を停止
            }
        }
    });
}

function checkCollision(obstacle, playerNum) {
    const player = playerNum === 1 ? player1 : player2;
    const playerAlive = playerNum === 1 ? player1Alive : player2Alive;
    
    if (!playerAlive) return false;
    
    const obstacleRect = obstacle.getBoundingClientRect();
    const playerRect = player.getBoundingClientRect();
    
    return !(
        obstacleRect.right < playerRect.left ||
        obstacleRect.left > playerRect.right ||
        obstacleRect.bottom < playerRect.top ||
        obstacleRect.top > playerRect.bottom
    );
}

function endGame() {
    gameState = 'gameover';
    clearInterval(gameInterval);
    clearInterval(spawnInterval);
    
    // 勝者の判定
    let winner = '';
    if (!player1Alive && !player2Alive) {
        if (score1 > score2) {
            winner = 'プレイヤー1の勝利！';
        } else if (score2 > score1) {
            winner = 'プレイヤー2の勝利！';
        } else {
            winner = '引き分け！';
        }
    } else if (!player1Alive) {
        winner = 'プレイヤー2の勝利！';
    } else {
        winner = 'プレイヤー1の勝利！';
    }
    
    // ゲームオーバー画面の表示
    winnerText.textContent = winner;
    finalScore1Display.textContent = score1;
    finalScore2Display.textContent = score2;
    
    // プレイヤーの透明度をリセット
    player1.style.opacity = '1';
    player2.style.opacity = '1';
    
    setTimeout(() => {
        gameOverScreen.classList.remove('hidden');
    }, 500);
}
