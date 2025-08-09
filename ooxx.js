// 遊戲狀態管理
const game = {
    board: Array(9).fill(null),
    currentPlayer: "X",
    isGameOver: false,
    mode: "hotseat",
    socket: null,
    isHost: false,
    playerRole: "X",
    roomId: "",
    connectionEstablished: false,

    // 初始化遊戲
    init() {
        this.render();
        this.bindEvents();
        this.updatePlayerIndicator();
        this.chat.init();
    },

    // 渲染棋盤
    render() {
        const cells = document.querySelectorAll('.cell');
        
        this.board.forEach((cell, index) => {
            cells[index].className = 'cell';
            if (cell === "X") {
                cells[index].classList.add('X');
                cells[index].textContent = 'X';
            } else if (cell === "O") {
                cells[index].classList.add('O');
                cells[index].textContent = 'O';
            } else {
                cells[index].textContent = '';
            }
            
            // 添加或移除點擊事件
            if (!this.isGameOver && 
                (this.mode === "hotseat" || 
                 (this.mode === "pve" && this.currentPlayer === "X") ||
                 (this.mode === "online" && this.connectionEstablished && this.currentPlayer === this.playerRole))
            ) {
                cells[index].classList.remove("disabled");
                cells[index].addEventListener('click', (e) => this.handlePlayerMove(e, index));
            } else {
                cells[index].classList.add("disabled");
                cells[index].removeEventListener('click', (e) => this.handlePlayerMove(e, index));
            }
        });
        
        const statusEl = document.getElementById("status");
        statusEl.className = "status";
        
        if (this.isGameOver) {
            const winner = this.getWinner();
            if (winner) {
                statusEl.textContent = `玩家 ${winner} 獲勝！`;
                statusEl.classList.add("win");
            } else {
                statusEl.textContent = "平局！";
                statusEl.classList.add("draw");
            }
        } else {
            if (this.mode === "online" && this.connectionEstablished) {
                if (this.currentPlayer === this.playerRole) {
                    statusEl.textContent = `您的回合 (玩家 ${this.currentPlayer})`;
                } else {
                    statusEl.textContent = `等待對方玩家下棋 (玩家 ${this.currentPlayer})`;
                }
            } else {
                statusEl.textContent = `玩家 ${this.currentPlayer} 回合`;
            }
        }
    },
    
    updatePlayerIndicator() {
        document.querySelectorAll(".player").forEach(playerEl => {
            playerEl.classList.remove("active");
            if (playerEl.textContent.includes(this.currentPlayer)) {
                playerEl.classList.add("active");
            }
            
            // 在線上模式顯示玩家角色
            if (this.mode === "online" && this.connectionEstablished) {
                if (playerEl.classList.contains("X") && this.playerRole === "X") {
                    playerEl.textContent = "您 (X)";
                } else if (playerEl.classList.contains("O") && this.playerRole === "O") {
                    playerEl.textContent = "您 (O)";
                } else if (playerEl.classList.contains("X") && this.playerRole === "O") {
                    playerEl.textContent = "對手 (X)";
                } else if (playerEl.classList.contains("O") && this.playerRole === "X") {
                    playerEl.textContent = "對手 (O)";
                }
            } else {
                // 非線上模式恢復默認顯示
                if (playerEl.classList.contains("X")) {
                    playerEl.textContent = "玩家 X";
                } else {
                    playerEl.textContent = "玩家 O";
                }
            }
        });
    },

    handlePlayerMove(e, index) {
        // 在线模式验证：确保玩家只能在自己的回合操作
        if (this.mode === "online" && this.currentPlayer !== this.playerRole) {
            return;
        }
        
        if (this.board[index] !== null || this.isGameOver) return;
        
        this.board[index] = this.currentPlayer;
        
        if (this.mode === "online" && this.socket && this.socket.readyState === WebSocket.OPEN) {
            // 发送极简指令：位置索引
            this.socket.send(JSON.stringify({
                type: "move",
                pos: index,
                player: this.currentPlayer
            }));
        }
        
        if (this.checkWin(this.currentPlayer)) {
            this.isGameOver = true;
            this.render();
            return;
        }
        
        if (this.checkDraw()) {
            this.isGameOver = true;
            this.render();
            return;
        }
        
        // 切换玩家
        this.currentPlayer = this.currentPlayer === "X" ? "O" : "X";
        
        // 如果是单人模式，轮到AI
        if (this.mode === "pve" && this.currentPlayer === "O") {
            this.render();
            this.updatePlayerIndicator();
            setTimeout(() => this.aiMove(), 500);
        } else {
            this.render();
            this.updatePlayerIndicator();
        }
    },

    aiMove() {
        if (this.isGameOver) return;
        
        const winPos = this.findWinOrBlock("O");
        if (winPos !== -1) {
            this.board[winPos] = "O";
            if (this.checkWin("O")) {
                this.isGameOver = true;
            } else if (this.checkDraw()) {
                this.isGameOver = true;
            } else {
                this.currentPlayer = "X";
            }
            this.render();
            this.updatePlayerIndicator();
            return;
        }
        
        const blockPos = this.findWinOrBlock("X");
        if (blockPos !== -1) {
            this.board[blockPos] = "O";
            if (this.checkWin("O")) {
                this.isGameOver = true;
            } else if (this.checkDraw()) {
                this.isGameOver = true;
            } else {
                this.currentPlayer = "X";
            }
            this.render();
            this.updatePlayerIndicator();
            return;
        }
        
        if (this.board[4] === null) {
            this.board[4] = "O";
            if (this.checkWin("O")) {
                this.isGameOver = true;
            } else if (this.checkDraw()) {
                this.isGameOver = true;
            } else {
                this.currentPlayer = "X";
            }
            this.render();
            this.updatePlayerIndicator();
            return;
        }
        
        const corners = [0, 2, 6, 8].filter(i => this.board[i] === null);
        if (corners.length > 0) {
            const corner = corners[Math.floor(Math.random() * corners.length)];
            this.board[corner] = "O";
            if (this.checkWin("O")) {
                this.isGameOver = true;
            } else if (this.checkDraw()) {
                this.isGameOver = true;
            } else {
                this.currentPlayer = "X";
            }
            this.render();
            this.updatePlayerIndicator();
            return;
        }
        
        const edges = [1, 3, 5, 7].filter(i => this.board[i] === null);
        if (edges.length > 0) {
            const edge = edges[Math.floor(Math.random() * edges.length)];
            this.board[edge] = "O";
            if (this.checkWin("O")) {
                this.isGameOver = true;
            } else if (this.checkDraw()) {
                this.isGameOver = true;
            } else {
                this.currentPlayer = "X";
            }
            this.render();
            this.updatePlayerIndicator();
        }
    },

    checkWin(player) {
        const winPatterns = [
            [0,1,2], [3,4,5], [6,7,8],
            [0,3,6], [1,4,7], [2,5,8],
            [0,4,8], [2,4,6]
        ];
        return winPatterns.some(pattern => 
            pattern.every(index => this.board[index] === player)
        );
    },

    checkDraw() {
        return this.board.every(cell => cell !== null);
    },

    findWinOrBlock(player) {
        const winPatterns = [
            [0,1,2], [3,4,5], [6,7,8],
            [0,3,6], [1,4,7], [2,5,8],
            [0,4,8], [2,4,6]
        ];
        
        for (const pattern of winPatterns) {
            const [a, b, c] = pattern;
            if (
                this.board[a] === player && 
                this.board[b] === player && 
                this.board[c] === null
            ) return c;
            if (
                this.board[a] === player && 
                this.board[c] === player && 
                this.board[b] === null
            ) return b;
            if (
                this.board[b] === player && 
                this.board[c] === player && 
                this.board[a] === null
            ) return a;
        }
        return -1;
    },

    getWinner() {
        if (this.checkWin("X")) return "X";
        if (this.checkWin("O")) return "O";
        return null;
    },

    reset() {
        this.board = Array(9).fill(null);
        this.isGameOver = false;
        
        // 重置玩家順序，主機永遠是X，客戶端永遠是O
        if (this.mode === "online" && this.connectionEstablished) {
            this.currentPlayer = "X"; // 總是從X開始
            
            // 發送重置指令
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({ 
                    type: "reset",
                    role: this.playerRole
                }));
            }
        } else {
            this.currentPlayer = "X";
        }
        
        this.updatePlayerIndicator();
        this.render();
    },

    switchMode(mode) {
        this.mode = mode;
        document.querySelectorAll(".mode-btn").forEach(btn => {
            btn.classList.remove("active");
            if (btn.dataset.mode === mode) {
                btn.classList.add("active");
            }
        });
        
        const connectionPanel = document.getElementById("connectionPanel");
        if (mode === "online") {
            connectionPanel.style.display = "block";
            this.chat.show();
            this.resetConnectionUI();
        } else {
            connectionPanel.style.display = "none";
            this.chat.hide();
            if (this.socket) {
                this.socket.close();
                this.socket = null;
            }
            this.connectionEstablished = false;
            this.updateConnectionStatus("未連接", "disconnected");
        }
        
        this.reset();
    },

    resetConnectionUI() {
        document.getElementById("roomId").value = "";
        this.updateConnectionStatus("未連接", "disconnected");
    },

    initWebSocket() {
        document.getElementById("createRoom").addEventListener("click", () => {
            this.createRoom();
        });
        
        document.getElementById("joinRoom").addEventListener("click", () => {
            this.joinRoom();
        });
    },

    createRoom() {
        this.isHost = true;
        this.playerRole = "X";
        this.resetConnectionUI();
        
        // 生成隨機房間號
        this.roomId = Math.random().toString(36).substr(2, 6).toUpperCase();
        document.getElementById("roomId").value = this.roomId;
        
        // 連接到 WebSocket 服務器
        const wsServer = "wss://hongyuwei.onrender.com";
        console.log("正在连接到:", wsServer);
        
        this.socket = new WebSocket(wsServer);
        
        this.socket.onopen = () => {
            console.log("WebSocket连接已建立");
            this.socket.send(JSON.stringify({ 
                type: "create", 
                roomId: this.roomId 
            }));
            this.updateConnectionStatus("等待玩家加入房間 " + this.roomId, "connecting");
        };
        
        this.socket.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            this.handleSocketMessage(msg);
        };
        
        this.socket.onclose = () => {
            console.log("WebSocket连接已关闭");
            this.connectionEstablished = false;
            this.updateConnectionStatus("服務器連接關閉", "disconnected");
        };
        
        this.socket.onerror = (err) => {
            console.error("WebSocket錯誤:", err);
            this.connectionEstablished = false;
            this.updateConnectionStatus("服務器連接錯誤", "disconnected");
        };
    },

    joinRoom() {
        this.isHost = false;
        this.playerRole = "O";
        this.roomId = document.getElementById("roomId").value.trim();
        if (!this.roomId) {
            alert("請輸入房間號");
            return;
        }
        
        const wsServer = "wss://hongyuwei.onrender.com";
        console.log("正在连接到:", wsServer);
        
        this.socket = new WebSocket(wsServer);
        
        this.socket.onopen = () => {
            console.log("WebSocket连接已建立");
            this.socket.send(JSON.stringify({ 
                type: "join", 
                roomId: this.roomId 
            }));
            this.updateConnectionStatus("正在加入房間 " + this.roomId, "connecting");
        };
        
        this.socket.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            this.handleSocketMessage(msg);
        };
        
        this.socket.onclose = () => {
            console.log("WebSocket连接已关闭");
            this.connectionEstablished = false;
            this.updateConnectionStatus("服務器連接關閉", "disconnected");
        };
        
        this.socket.onerror = (err) => {
            console.error("WebSocket錯誤:", err);
            this.connectionEstablished = false;
            this.updateConnectionStatus("服務器連接錯誤", "disconnected");
        };
    },

    handleSocketMessage(msg) {
        console.log("收到服务器消息:", msg);
        
        switch (msg.type) {
            case "room_created":
                this.updateConnectionStatus("房間已創建，等待玩家加入", "connecting");
                break;
                
            case "room_joined":
                this.connectionEstablished = true;
                this.updateConnectionStatus("已加入房間，等待開始", "connected");
                this.playerRole = msg.role;
                this.updatePlayerIndicator();
                break;
                
            case "player_joined":
                this.connectionEstablished = true;
                this.updateConnectionStatus("對方玩家已加入", "connected");
                this.render();
                break;
                
            case "move":
                if (msg.pos !== undefined) {
                    // 更新棋盘
                    this.board[msg.pos] = msg.player;
                    
                    // 检查游戏状态
                    if (this.checkWin(msg.player)) {
                        this.isGameOver = true;
                    } else if (this.checkDraw()) {
                        this.isGameOver = true;
                    } else {
                        // 切换当前玩家
                        this.currentPlayer = msg.player === "X" ? "O" : "X";
                    }
                    
                    this.render();
                    this.updatePlayerIndicator();
                }
                break;
                
            case "reset":
                // 重置遊戲狀態
                this.board = Array(9).fill(null);
                this.isGameOver = false;
                
                // 確保主機永遠是X，客戶端永遠是O
                if (this.isHost) {
                    this.playerRole = "X";
                    this.currentPlayer = "X";
                } else {
                    this.playerRole = "O";
                    this.currentPlayer = "X"; // 總是從X開始
                }
                
                this.render();
                this.updatePlayerIndicator();
                break;
                
            case "chat":
                this.chat.handleChatMessage(msg.sender, msg.message);
                break;
                
            case "error":
                alert("錯誤: " + msg.message);
                this.connectionEstablished = false;
                this.updateConnectionStatus("連接錯誤", "disconnected");
                break;
        }
    },

    updateConnectionStatus(text, status) {
        console.log("更新连接状态:", text, status);
        document.getElementById("connectionStatus").textContent = text;
        const indicator = document.getElementById("statusIndicator");
        indicator.className = "status-indicator";
        
        if (status === "connecting") {
            indicator.classList.add("connecting");
        } else if (status === "connected") {
            indicator.classList.add("connected");
        }
    },

    bindEvents() {
        document.getElementById("reset").addEventListener("click", () => this.reset());
        
        document.querySelectorAll(".mode-btn").forEach(btn => {
            btn.addEventListener("click", () => this.switchMode(btn.dataset.mode));
        });
        
        document.getElementById("backToLobby").addEventListener("click", () => {
            if (this.socket) {
                this.socket.close();
            }
            window.location.href = "index.html";
        });
        
        this.initWebSocket();
    },
    
    // 聊天功能
    chat: {
        messages: [],
        chatBox: null,
        chatMessages: null,
        chatInput: null,
        sendChatBtn: null,
        charCount: null,
        chatStatusIndicator: null,
        chatConnectionStatus: null,
        
        // 初始化聊天
        init() {
            this.messages = [];
            this.chatBox = document.getElementById("chatBox");
            this.chatMessages = document.getElementById("chatMessages");
            this.chatInput = document.getElementById("chatInput");
            this.sendChatBtn = document.getElementById("sendChat");
            this.charCount = document.getElementById("charCount");
            this.chatStatusIndicator = document.getElementById("chatStatusIndicator");
            this.chatConnectionStatus = document.getElementById("chatConnectionStatus");
            
            // 绑定事件
            this.sendChatBtn.addEventListener("click", () => this.sendMessage());
            this.chatInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter") this.sendMessage();
            });
            
            // 字符计数
            this.chatInput.addEventListener("input", () => {
                const length = this.chatInput.value.length;
                this.charCount.textContent = `${length}/30`;
                this.charCount.className = "char-count";
                
                if (length > 25) this.charCount.classList.add("warning");
                if (length > 29) this.charCount.classList.add("error");
            });
        },
        
        // 显示聊天框
        show() {
            this.chatBox.style.display = "block";
        },
        
        // 隐藏聊天框
        hide() {
            this.chatBox.style.display = "none";
        },
        
        // 更新连接状态
        updateConnectionStatus(text, status) {
            this.chatConnectionStatus.textContent = text;
            this.chatStatusIndicator.className = "status-indicator";
            
            if (status === "connecting") {
                this.chatStatusIndicator.classList.add("connecting");
            } else if (status === "connected") {
                this.chatStatusIndicator.classList.add("connected");
            }
        },
        
        // 发送消息
        sendMessage() {
            const message = this.chatInput.value.trim();
            if (!message) return;
            
            if (message.length > 30) {
                alert("消息不能超过30个字符");
                return;
            }
            
            // 添加到本地消息列表
            this.addMessage("你", message, true);
            this.chatInput.value = "";
            this.charCount.textContent = "0/30";
            this.charCount.className = "char-count";
            
            if (game.mode === "online" && game.connectionEstablished) {
                // 发送到游戏服务器
                game.socket.send(JSON.stringify({
                    type: "chat",
                    sender: game.playerRole,
                    message: message
                }));
            } else {
                // 本地模式直接显示
                setTimeout(() => {
                    this.addMessage("對手", "已收到消息", false);
                }, 1000);
            }
        },
        
        // 添加消息到聊天框
        addMessage(sender, message, isSelf) {
            const messageEl = document.createElement("div");
            messageEl.className = `message ${isSelf ? "self" : "opponent"}`;
            messageEl.textContent = `${sender}: ${message}`;
            this.chatMessages.appendChild(messageEl);
            
            // 自动滚动到底部
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        },
        
        // 处理收到的消息
        handleChatMessage(sender, message) {
            const isSelf = sender === game.playerRole;
            this.addMessage(isSelf ? "你" : "對手", message, isSelf);
        }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    game.init();
});