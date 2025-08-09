// 象棋遊戲邏輯
const chessGame = {
    board: [], // 棋盤狀態
    currentPlayer: "red", // 當前玩家
    selectedPiece: null, // 選中的棋子
    mode: "hotseat", // 模式
    socket: null, // WebSocket連接
    isHost: false, // 是否為房主
    playerRole: "red", // 玩家角色
    roomId: "", // 房間ID
    connectionEstablished: false, // 是否已連接

    // 棋子類型
    pieces: {
        king: { name: "帥", char: "帥" },
        guard: { name: "仕", char: "仕" },
        bishop: { name: "相", char: "相" },
        knight: { name: "馬", char: "傌" },
        rook: { name: "車", char: "俥" },
        cannon: { name: "炮", char: "炮" },
        pawn: { name: "兵", char: "兵" }
    },

    // 初始化遊戲
    init() {
        this.createBoard();
        this.setupPieces();
        this.bindEvents();
    },

    // 創建棋盤
    createBoard() {
        const board = document.getElementById("chessBoard");
        board.innerHTML = "";
        
        // 創建10行9列的棋盤
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = document.createElement("div");
                cell.className = "chess-cell";
                cell.dataset.row = row;
                cell.dataset.col = col;
                board.appendChild(cell);
            }
            
            // 在第5行插入楚河漢界
            if (row === 4) {
                const river = document.createElement("div");
                river.className = "river";
                river.textContent = "楚河　　　　　　　　漢界";
                board.appendChild(river);
            }
        }
        
        // 添加九宮格標記
        this.addPalaceMarks();
    },

    // 添加九宮格標記
    addPalaceMarks() {
        const marks = [
            // 紅方九宮格
            { row: 0, col: 3, type: "top-left" },
            { row: 0, col: 5, type: "top-right" },
            { row: 2, col: 3, type: "bottom-left" },
            { row: 2, col: 5, type: "bottom-right" },
            
            // 黑方九宮格
            { row: 7, col: 3, type: "top-left" },
            { row: 7, col: 5, type: "top-right" },
            { row: 9, col: 3, type: "bottom-left" },
            { row: 9, col: 5, type: "bottom-right" }
        ];
        
        marks.forEach(mark => {
            const cell = document.querySelector(`.chess-cell[data-row="${mark.row}"][data-col="${mark.col}"]`);
            if (cell) {
                const markEl = document.createElement("div");
                markEl.className = `palace-mark ${mark.type}`;
                cell.appendChild(markEl);
            }
        });
    },

    // 設置棋子
    setupPieces() {
        // 初始化棋盤陣列
        this.board = Array(10).fill().map(() => Array(9).fill(null));
        
        // 擺放棋子
        // 紅方
        this.board[0][0] = { type: "rook", player: "red" };
        this.board[0][1] = { type: "knight", player: "red" };
        this.board[0][2] = { type: "bishop", player: "red" };
        this.board[0][3] = { type: "guard", player: "red" };
        this.board[0][4] = { type: "king", player: "red" };
        this.board[0][5] = { type: "guard", player: "red" };
        this.board[0][6] = { type: "bishop", player: "red" };
        this.board[0][7] = { type: "knight", player: "red" };
        this.board[0][8] = { type: "rook", player: "red" };
        this.board[2][1] = { type: "cannon", player: "red" };
        this.board[2][7] = { type: "cannon", player: "red" };
        this.board[3][0] = { type: "pawn", player: "red" };
        this.board[3][2] = { type: "pawn", player: "red" };
        this.board[3][4] = { type: "pawn", player: "red" };
        this.board[3][6] = { type: "pawn", player: "red" };
        this.board[3][8] = { type: "pawn", player: "red" };
        
        // 黑方
        this.board[9][0] = { type: "rook", player: "black" };
        this.board[9][1] = { type: "knight", player: "black" };
        this.board[9][2] = { type: "bishop", player: "black" };
        this.board[9][3] = { type: "guard", player: "black" };
        this.board[9][4] = { type: "king", player: "black" };
        this.board[9][5] = { type: "guard", player: "black" };
        this.board[9][6] = { type: "bishop", player: "black" };
        this.board[9][7] = { type: "knight", player: "black" };
        this.board[9][8] = { type: "rook", player: "black" };
        this.board[7][1] = { type: "cannon", player: "black" };
        this.board[7][7] = { type: "cannon", player: "black" };
        this.board[6][0] = { type: "pawn", player: "black" };
        this.board[6][2] = { type: "pawn", player: "black" };
        this.board[6][4] = { type: "pawn", player: "black" };
        this.board[6][6] = { type: "pawn", player: "black" };
        this.board[6][8] = { type: "pawn", player: "black" };
        
        // 渲染棋子到棋盤
        this.updateBoard();
    },

    // 更新棋盤顯示
    updateBoard() {
        const cells = document.querySelectorAll('.chess-cell');
        cells.forEach(cell => {
            cell.innerHTML = '';
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const piece = this.board[row][col];
            
            if (piece) {
                const pieceEl = document.createElement('div');
                pieceEl.className = `chess-piece ${piece.player}`;
                pieceEl.textContent = this.pieces[piece.type].char;
                pieceEl.dataset.row = row;
                pieceEl.dataset.col = col;
                cell.appendChild(pieceEl);
            }
            
            // 添加九宮格標記（如果有的話）
            if (cell.querySelector('.palace-mark')) {
                const mark = cell.querySelector('.palace-mark').cloneNode(true);
                cell.appendChild(mark);
            }
        });
    },

    // 事件綁定
    bindEvents() {
        const board = document.getElementById("chessBoard");
        board.addEventListener('click', (e) => {
            const piece = e.target.closest('.chess-piece');
            const cell = e.target.closest('.chess-cell');
            
            if (piece) {
                this.handlePieceClick(piece);
            } else if (cell) {
                this.handleCellClick(cell);
            }
        });
        
        document.getElementById("reset").addEventListener('click', () => {
            this.reset();
        });
        
        document.getElementById("backToLobby").addEventListener("click", () => {
            if (this.socket) {
                this.socket.close();
            }
            window.location.href = "index.html";
        });
        
        // 模式切换事件
        document.querySelectorAll(".mode-btn").forEach(btn => {
            btn.addEventListener("click", () => this.switchMode(btn.dataset.mode));
        });
        
        // WebSocket初始化
        this.initWebSocket();
    },

    // 點擊棋子
    handlePieceClick(piece) {
        const row = parseInt(piece.dataset.row);
        const col = parseInt(piece.dataset.col);
        const pieceData = this.board[row][col];
        
        // 只能選擇當前玩家的棋子
        if (pieceData.player === this.currentPlayer) {
            this.selectedPiece = { row, col, piece: pieceData };
            // 高亮選中的棋子
            this.clearSelection();
            piece.classList.add("selected");
        }
    },

    // 點擊格子
    handleCellClick(cell) {
        if (!this.selectedPiece) return;
        
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        // 移動棋子
        this.movePiece(this.selectedPiece.row, this.selectedPiece.col, row, col);
    },

    // 移動棋子
    movePiece(fromRow, fromCol, toRow, toCol) {
        // 檢查移動是否合法（這裡省略，只做簡單移動）
        this.board[toRow][toCol] = this.board[fromRow][fromCol];
        this.board[fromRow][fromCol] = null;
        this.selectedPiece = null;
        this.clearSelection();
        
        // 切換玩家
        this.currentPlayer = this.currentPlayer === "red" ? "black" : "red";
        this.updatePlayerIndicator();
        this.updateBoard();
    },

    // 清除選中狀態
    clearSelection() {
        document.querySelectorAll('.chess-piece').forEach(p => {
            p.classList.remove("selected");
        });
    },

    // 更新玩家指示器
    updatePlayerIndicator() {
        document.querySelectorAll(".player").forEach(playerEl => {
            playerEl.classList.remove("active");
            if (playerEl.classList.contains(this.currentPlayer)) {
                playerEl.classList.add("active");
            }
        });
        document.getElementById("status").textContent = `${this.currentPlayer === "red" ? "紅方" : "黑方"}回合`;
    },

    // 重置遊戲
    reset() {
        this.selectedPiece = null;
        this.currentPlayer = "red";
        this.clearSelection();
        this.setupPieces();
        this.updatePlayerIndicator();
    },
    
    // 切換遊戲模式
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
            this.resetConnectionUI();
        } else {
            connectionPanel.style.display = "none";
            if (this.socket) {
                this.socket.close();
                this.socket = null;
            }
            this.connectionEstablished = false;
            this.updateConnectionStatus("未連接", "disconnected");
        }
        
        this.reset();
    },
    
    // 初始化WebSocket
    initWebSocket() {
        document.getElementById("createRoom").addEventListener("click", () => {
            this.createRoom();
        });
        
        document.getElementById("joinRoom").addEventListener("click", () => {
            this.joinRoom();
        });
    },
    
    // 創建房間
    createRoom() {
        this.isHost = true;
        this.playerRole = "red";
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
                roomId: this.roomId,
                game: "chess"
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
    
    // 加入房間
    joinRoom() {
        this.isHost = false;
        this.playerRole = "black";
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
                roomId: this.roomId,
                game: "chess"
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
    
    // 處理WebSocket消息
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
                break;
                
            case "move":
                // 處理移動消息
                break;
                
            case "reset":
                // 處理重置消息
                break;
                
            case "error":
                alert("錯誤: " + msg.message);
                this.connectionEstablished = false;
                this.updateConnectionStatus("連接錯誤", "disconnected");
                break;
        }
    },
    
    // 更新連接狀態
    updateConnectionStatus(text, status) {
        document.getElementById("connectionStatus").textContent = text;
        const indicator = document.getElementById("statusIndicator");
        indicator.className = "status-indicator";
        
        if (status === "connecting") {
            indicator.classList.add("connecting");
        } else if (status === "connected") {
            indicator.classList.add("connected");
        }
    },
    
    // 重置連接UI
    resetConnectionUI() {
        document.getElementById("roomId").value = "";
        this.updateConnectionStatus("未連接", "disconnected");
    }
};

document.addEventListener("DOMContentLoaded", () => {
    chessGame.init();
});