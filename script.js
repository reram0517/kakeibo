// Firebase設定
const firebaseConfig = {
    apiKey: "AIzaSyAF2wQbwCrnSJMWrRRZC_XkjinzNHl3rPw",
    authDomain: "kakeibo-app-1201.firebaseapp.com",
    databaseURL: "https://kakeibo-app-1201-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "kakeibo-app-1201",
    storageBucket: "kakeibo-app-1201.firebasestorage.app",
    messagingSenderId: "809121724984",
    appId: "1:809121724984:web:37f8c5f53b5f401b6484cd"
};

// Firebase初期化
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

let currentUser = null;
let transactions = [];

// DOM要素の取得（ページ読み込み後に実行）
let form, transactionList, totalIncomeEl, totalExpenseEl, balanceEl;
let filterButtons, navButtons, pageContents;

let currentFilter = 'all';
let lineChart = null;
let pieChart = null;
let balanceChart = null;
let currentChartView = 'daily';
let currentMonth = new Date();
let selectedDate = new Date();
let currentWeekOffset = 0;

// 前方宣言（関数は後で定義）
let updateUI, updateSummary, displayTransactions, updateCharts, renderCalendar;
let formatCurrency, editTransaction, deleteTransaction, updateLineChart, updatePieChart, updateBalanceChart;
let createCalendarDay, displayDayTransactions;
let showAuthScreen, showMainApp, loadUserData, saveTransactions, getErrorMessage, initializeEventListeners;
let formatDate, showNotification;
let updateBudgetDisplay, loadBudget;
let customConfirm;

// カスタム確認ダイアログ
customConfirm = function(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        const messageEl = document.getElementById('confirm-message');
        const okBtn = document.getElementById('confirm-ok');
        const cancelBtn = document.getElementById('confirm-cancel');
        
        messageEl.textContent = message;
        modal.style.display = 'flex';
        
        const handleOk = () => {
            modal.style.display = 'none';
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(true);
        };
        
        const handleCancel = () => {
            modal.style.display = 'none';
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(false);
        };
        
        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);
    });
};

// 画面表示切り替え
showAuthScreen = function() {
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('main-app').style.display = 'none';
}

showMainApp = function() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    
    // DOM要素を取得（初回のみ）
    if (!form) {
        form = document.getElementById('transaction-form');
        transactionList = document.getElementById('transaction-list');
        totalIncomeEl = document.getElementById('total-income');
        totalExpenseEl = document.getElementById('total-expense');
        balanceEl = document.getElementById('balance');
        filterButtons = document.querySelectorAll('.filter-btn');
        navButtons = document.querySelectorAll('.nav-btn');
        pageContents = document.querySelectorAll('.page-content');
        
        // 今日の日付をデフォルトにセット
        document.getElementById('date').valueAsDate = new Date();
        
        // イベントリスナーを設定
        initializeEventListeners();
        
        // 予算データを読み込む
        loadBudget();
    }
}

// Firebaseからユーザーデータを読み込む
loadUserData = function() {
    if (!currentUser) return;
    
    const userRef = database.ref('users/' + currentUser.uid + '/transactions');
    userRef.on('value', (snapshot) => {
        const data = snapshot.val();
        transactions = data ? Object.values(data) : [];
        // DOM要素とupdateUI関数が準備できるまで待つ
        const checkAndUpdate = () => {
            if (typeof updateUI === 'function' && document.getElementById('total-income')) {
                updateUI();
            } else {
                setTimeout(checkAndUpdate, 50);
            }
        };
        checkAndUpdate();
    });
}

// Firebaseにデータを保存
saveTransactions = function() {
    if (!currentUser) return;
    
    const userRef = database.ref('users/' + currentUser.uid + '/transactions');
    const transactionsObj = {};
    transactions.forEach(t => {
        transactionsObj[t.id] = t;
    });
    userRef.set(transactionsObj);
}

// 認証タブの切り替え
document.addEventListener('DOMContentLoaded', () => {
    const authTabs = document.querySelectorAll('.auth-tab');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            if (tab.dataset.tab === 'login') {
                loginForm.classList.add('active');
                signupForm.classList.remove('active');
            } else {
                signupForm.classList.add('active');
                loginForm.classList.remove('active');
            }
        });
    });
    
    // ログインフォーム
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        
        try {
            await auth.signInWithEmailAndPassword(email, password);
            errorEl.textContent = '';
        } catch (error) {
            errorEl.textContent = getErrorMessage(error.code);
        }
    });
    
    // 新規登録フォーム
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-password-confirm').value;
        const errorEl = document.getElementById('signup-error');
        
        if (password !== confirmPassword) {
            errorEl.textContent = 'パスワードが一致しません';
            return;
        }
        
        try {
            await auth.createUserWithEmailAndPassword(email, password);
            errorEl.textContent = '';
        } catch (error) {
            errorEl.textContent = getErrorMessage(error.code);
        }
    });
    
    // ログアウトボタン
    document.getElementById('logout-btn').addEventListener('click', () => {
        auth.signOut();
    });
});

// エラーメッセージの日本語化
getErrorMessage = function(errorCode) {
    switch (errorCode) {
        case 'auth/email-already-in-use':
            return 'このメールアドレスは既に使用されています';
        case 'auth/invalid-email':
            return 'メールアドレスの形式が正しくありません';
        case 'auth/weak-password':
            return 'パスワードは6文字以上で設定してください';
        case 'auth/user-not-found':
            return 'ユーザーが見つかりません';
        case 'auth/wrong-password':
            return 'パスワードが正しくありません';
        default:
            return 'エラーが発生しました: ' + errorCode;
    }
}

// 認証状態の監視（関数定義後に実行）
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        showMainApp();
        loadUserData();
    } else {
        currentUser = null;
        showAuthScreen();
    }
});

// イベントリスナーの初期化
initializeEventListeners = function() {

// カレンダーのナビゲーション
document.getElementById('prev-month').addEventListener('click', () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    renderCalendar();
});

document.getElementById('next-month').addEventListener('click', () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    renderCalendar();
});

// 週のナビゲーション
document.getElementById('prev-week').addEventListener('click', () => {
    currentWeekOffset++;
    updateLineChart();
});

document.getElementById('next-week').addEventListener('click', () => {
    currentWeekOffset--;
    updateLineChart();
});

// ナビゲーションタブのイベント
navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetPage = btn.dataset.page;
        
        // すべてのナビボタンとページを非アクティブに
        navButtons.forEach(b => b.classList.remove('active'));
        pageContents.forEach(p => p.classList.remove('active'));
        
        // 選択されたボタンとページをアクティブに
        btn.classList.add('active');
        document.getElementById(`page-${targetPage}`).classList.add('active');
        
        // グラフページに切り替えたときはグラフを更新
        if (targetPage === 'charts') {
            updateCharts();
        }
        
        // カレンダーページに切り替えたときはカレンダーを更新
        if (targetPage === 'calendar') {
            renderCalendar();
        }
        
        // 予算ページに切り替えたときは状況を更新
        if (targetPage === 'budget') {
            updateBudgetDisplay();
            updateDailyBudget();
        }
    });
});

// 予算タブ内の切り替え
const budgetTabButtons = document.querySelectorAll('.budget-tab-btn');
const budgetViews = document.querySelectorAll('.budget-view');

budgetTabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetView = btn.dataset.budgetTab;
        
        // すべてのボタンとビューを非アクティブに
        budgetTabButtons.forEach(b => b.classList.remove('active'));
        budgetViews.forEach(v => v.classList.remove('active'));
        
        // 選択されたボタンとビューをアクティブに
        btn.classList.add('active');
        document.getElementById(`budget-${targetView}-view`).classList.add('active');
        
        // 状況ビューに切り替えたときは表示を更新
        if (targetView === 'status') {
            updateBudgetDisplay();
            updateDailyBudget();
        }
    });
});

// フォーム送信イベント
form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const description = document.getElementById('description').value || 'なし';
    const amount = parseFloat(document.getElementById('amount').value);
    const type = document.getElementById('type').value;
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;
    
    // 編集モードかチェック
    const editId = form.dataset.editId;
    
    if (editId) {
        // 既存の取引を編集
        const index = transactions.findIndex(t => t.id === parseInt(editId));
        if (index !== -1) {
            transactions[index] = {
                id: parseInt(editId),
                description,
                amount,
                type,
                category,
                date
            };
            showNotification('取引を更新しました！');
        }
        delete form.dataset.editId;
        document.querySelector('.btn-add').textContent = '追加';
        
        // ホーム画面に戻る
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
        document.querySelector('[data-page="home"]').classList.add('active');
        document.getElementById('page-home').classList.add('active');
    } else {
        // 新しい取引を追加
        const transaction = {
            id: Date.now(),
            description,
            amount,
            type,
            category,
            date
        };
        transactions.push(transaction);
        showNotification('取引を追加しました！');
    }
    
    
    saveTransactions();
    updateUI();
    
    // フォームをリセット
    form.reset();
    document.getElementById('date').valueAsDate = new Date();
    
    // 入力画面に留まる（何もしない）
});

// フィルターボタンのイベント
filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        displayTransactions();
    });
});

// グラフタブのイベント
const tabButtons = document.querySelectorAll('.tab-btn');
tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentChartView = btn.dataset.tab;
        updateLineChart();
    });
});

// 予算管理のイベントリスナー
// 給料日を保存
document.getElementById('save-payday').addEventListener('click', () => {
    const paydayInput = document.getElementById('payday');
    const selectedPayday = paydayInput.value;
    
    if (selectedPayday) {
        // カレンダー入力から日付を取得（日だけ抽出）
        const paydayDate = new Date(selectedPayday + 'T00:00:00');
        payday = paydayDate.getDate();
        
        // Firebaseに保存
        if (currentUser) {
            database.ref('users/' + currentUser.uid + '/budget/payday').set(payday);
        }
        
        updateDailyBudget();
        showNotification('給料日を保存しました');
    } else {
        showNotification('給料日を入力してください', 'error');
    }
});

// 給料日入力をリセット
const resetPaydayBtn = document.getElementById('reset-payday');
if (resetPaydayBtn) {
    resetPaydayBtn.addEventListener('click', async () => {
        console.log('給料日クリアボタンがクリックされました');
        const confirmed = await customConfirm('給料日をクリアしますか？');
        if (confirmed) {
            payday = null;
            document.getElementById('payday').value = '';
            
            // Firebaseから削除
            if (currentUser) {
                database.ref('users/' + currentUser.uid + '/budget/payday').remove();
            }
            
            // 状況ビューの表示を即座に更新
            const dailyAmountEl = document.getElementById('daily-amount');
            const dailyInfoEl = document.getElementById('daily-info');
            if (dailyAmountEl) {
                dailyAmountEl.textContent = '―';
                dailyAmountEl.style.color = '#999';
            }
            if (dailyInfoEl) {
                dailyInfoEl.textContent = '給料日を設定してください';
            }
            
            showNotification('給料日をクリアしました');
        }
    });
} else {
    console.error('給料日クリアボタンが見つかりません');
}

// 予算を保存
document.getElementById('save-budget').addEventListener('click', () => {
    const budgetInput = document.getElementById('monthly-budget');
    const budget = parseInt(budgetInput.value) || 0;
    
    if (budget > 0) {
        monthlyBudget = budget;
        
        // Firebaseに保存
        if (currentUser) {
            database.ref('users/' + currentUser.uid + '/budget/monthly').set(monthlyBudget);
        }
        
        updateBudgetDisplay();
        updateDailyBudget();
        showNotification('予算を保存しました');
    } else {
        showNotification('予算を入力してください', 'error');
    }
});

// カテゴリ選択ボタンのイベント
let selectedCategory = null;

document.querySelectorAll('.category-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        selectedCategory = btn.dataset.category;
        
        // すべてのボタンの選択状態をクリア
        document.querySelectorAll('.category-select-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        
        // 入力フォームを表示
        const inputDiv = document.getElementById('selected-category-input');
        const label = document.getElementById('selected-category-label');
        const input = document.getElementById('selected-category-budget');
        
        inputDiv.style.display = 'block';
        label.textContent = `${selectedCategory}の予算`;
        
        // 既存の予算があれば表示
        input.value = categoryBudgets[selectedCategory] || '';
        input.focus();
    });
});

// 選択されたカテゴリの予算を保存
document.getElementById('save-selected-category-budget').addEventListener('click', () => {
    if (!selectedCategory) {
        showNotification('カテゴリを選択してください', 'error');
        return;
    }
    
    const budgetInput = document.getElementById('selected-category-budget');
    const budget = parseInt(budgetInput.value) || 0;
    
    if (budget > 0) {
        categoryBudgets[selectedCategory] = budget;
        
        // Firebaseに保存
        if (currentUser) {
            database.ref('users/' + currentUser.uid + '/categoryBudgets').set(categoryBudgets);
        }
        
        const savedCategory = selectedCategory;
        
        // フォームをリセット
        budgetInput.value = '';
        document.getElementById('selected-category-input').style.display = 'none';
        document.querySelectorAll('.category-select-btn').forEach(b => b.classList.remove('selected'));
        selectedCategory = null;
        
        updateSetCategoryList();
        updateBudgetDisplay();
        showNotification(`${savedCategory}の予算を保存しました`);
    } else {
        showNotification('予算を入力してください', 'error');
    }
});

// カテゴリ予算入力をキャンセル（入力フォームをクリア）
document.getElementById('cancel-category-budget').addEventListener('click', () => {
    document.getElementById('selected-category-input').style.display = 'none';
    document.getElementById('selected-category-budget').value = '';
    document.querySelectorAll('.category-select-btn').forEach(b => b.classList.remove('selected'));
    selectedCategory = null;
});

// 設定済みカテゴリ一覧を更新
const updateSetCategoryList = function() {
    const listDiv = document.getElementById('set-category-list');
    listDiv.innerHTML = '';
    
    if (Object.keys(categoryBudgets).length === 0) {
        listDiv.innerHTML = '<p style="color: #999; text-align: center; padding: 10px;">設定された予算はありません</p>';
        return;
    }
    
    Object.keys(categoryBudgets).forEach(category => {
        const amount = categoryBudgets[category];
        const item = document.createElement('div');
        item.className = 'set-category-item';
        item.innerHTML = `
            <span class="category-name">${category}</span>
            <span class="category-amount">¥${amount.toLocaleString()}</span>
            <button class="btn-delete-category" data-category="${category}">削除</button>
        `;
        listDiv.appendChild(item);
    });
    
    // 削除ボタンのイベント
    document.querySelectorAll('.btn-delete-category').forEach(btn => {
        btn.addEventListener('click', async () => {
            const category = btn.dataset.category;
            const confirmed = await customConfirm(`${category}の予算を削除しますか？`);
            if (confirmed) {
                delete categoryBudgets[category];
                
                // Firebaseに保存
                if (currentUser) {
                    database.ref('users/' + currentUser.uid + '/categoryBudgets').set(categoryBudgets);
                }
                
                updateSetCategoryList();
                updateBudgetDisplay();
                showNotification(`${category}の予算を削除しました`);
            }
        });
    });
};

// 予算入力をリセット
const resetBudgetBtn = document.getElementById('reset-budget');
if (resetBudgetBtn) {
const resetBudgetBtn = document.getElementById('reset-budget');
if (resetBudgetBtn) {
    resetBudgetBtn.addEventListener('click', async () => {
        console.log('予算クリアボタンがクリックされました');
        const confirmed = await customConfirm('月間予算をクリアしますか？');
        if (confirmed) {
            monthlyBudget = 0;
            document.getElementById('monthly-budget').value = '';
            
            // Firebaseから削除
            if (currentUser) {
                database.ref('users/' + currentUser.uid + '/budget/monthly').remove();
            }
            
            // 状況ビューの表示を即座に更新
            const budgetAmountEl = document.getElementById('budget-amount');
            const usedAmountEl = document.getElementById('used-amount');
            const remainingAmountEl = document.getElementById('remaining-amount');
            const progressFillEl = document.getElementById('progress-fill');
            const progressTextEl = document.getElementById('progress-text');
            const dailyAmountEl = document.getElementById('daily-amount');
            const dailyInfoEl = document.getElementById('daily-info');
            
            if (budgetAmountEl) budgetAmountEl.textContent = '未設定';
            if (usedAmountEl) usedAmountEl.textContent = '¥0';
            if (remainingAmountEl) remainingAmountEl.textContent = '―';
            if (progressFillEl) progressFillEl.style.width = '0%';
            if (progressTextEl) progressTextEl.textContent = '予算が未設定です';
            
            // 1日に使える金額もリセット
            if (dailyAmountEl) {
                dailyAmountEl.textContent = '―';
                dailyAmountEl.style.color = '#999';
            }
            if (dailyInfoEl && !payday) {
                dailyInfoEl.textContent = '給料日を設定してください';
            }
            
            showNotification('予算をクリアしました');
        }
    });
} else {
    console.error('予算クリアボタンが見つかりません');
}

// カテゴリ別予算をリセット
document.getElementById('reset-category-budget').addEventListener('click', async () => {
    const confirmed = await customConfirm('カテゴリ別予算をすべてリセットしますか？');
    if (confirmed) {
        categoryBudgets = {};
        
        // Firebaseから削除
        if (currentUser) {
            database.ref('users/' + currentUser.uid + '/categoryBudgets').remove();
        }
        
        updateSetCategoryList();
        updateBudgetDisplay();
        showNotification('カテゴリ別予算をリセットしました');
    }
});

}; // initializeEventListeners関数の終わり

// 取引を削除
deleteTransaction = async function(id) {
    const confirmed = await customConfirm('本当に削除しますか？');
    if (confirmed) {
        transactions = transactions.filter(t => t.id !== id);
        saveTransactions();
        updateUI();
        showNotification('取引を削除しました');
    }
}

// 取引を編集
editTransaction = function(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;
    
    // フォームに値を設定
    document.getElementById('description').value = transaction.description === 'なし' ? '' : transaction.description;
    document.getElementById('amount').value = transaction.amount;
    document.getElementById('type').value = transaction.type;
    document.getElementById('category').value = transaction.category;
    document.getElementById('date').value = transaction.date;
    
    // 編集モードを設定
    form.dataset.editId = id;
    document.querySelector('.btn-add').textContent = '更新';
    
    // 追加ページに移動してフォームまでスクロール
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    document.querySelector('[data-page="add"]').classList.add('active');
    document.getElementById('page-add').classList.add('active');
}

// UIを更新
updateUI = function() {
    if (!totalIncomeEl) return;
    updateSummary();
    displayTransactions();
    updateCharts();
    if (document.getElementById('page-calendar') && document.getElementById('page-calendar').classList.contains('active')) {
        renderCalendar();
    }
    // 予算表示を更新
    if (monthlyBudget > 0) {
        updateBudgetDisplay();
        updateDailyBudget();
    }
};

// サマリーを更新
updateSummary = function() {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const balance = income - expense;
    
    totalIncomeEl.textContent = formatCurrency(income);
    totalExpenseEl.textContent = formatCurrency(expense);
    balanceEl.textContent = formatCurrency(balance);
    
    // 残高の色を変更
    if (balance >= 0) {
        balanceEl.style.color = '#28a745';
    } else {
        balanceEl.style.color = '#dc3545';
    }
}

// 取引を表示
displayTransactions = function() {
    // フィルター適用
    let filteredTransactions = transactions;
    if (currentFilter !== 'all') {
        filteredTransactions = transactions.filter(t => t.type === currentFilter);
    }
    
    // 日付順にソート（新しい順）
    filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    transactionList.innerHTML = '';
    
    if (filteredTransactions.length === 0) {
        transactionList.innerHTML = '<li class="empty-message">取引がありません</li>';
        return;
    }
    
    filteredTransactions.forEach(transaction => {
        const li = document.createElement('li');
        li.className = `transaction-item ${transaction.type}`;
        
        const sign = transaction.type === 'income' ? '+' : '-';
        const formattedDate = formatDate(transaction.date);
        
        li.innerHTML = `
            <div class="transaction-info">
                <div class="transaction-description">${transaction.description}</div>
                <div class="transaction-details">
                    ${transaction.category} • ${formattedDate}
                </div>
            </div>
            <div class="transaction-amount ${transaction.type}">
                ${sign}${formatCurrency(transaction.amount)}
            </div>
            <div class="transaction-actions">
                <button class="btn-edit" onclick="editTransaction(${transaction.id})">
                    編集
                </button>
                <button class="btn-delete" onclick="deleteTransaction(${transaction.id})">
                    削除
                </button>
            </div>
        `;
        
        transactionList.appendChild(li);
    });
}

// 通貨フォーマット
formatCurrency = function(amount) {
    return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY'
    }).format(amount);
}

// 日付フォーマット
formatDate = function(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}/${month}/${day}`;
}

// 通知を表示
showNotification = function(message) {
    // シンプルなアラート（後でよりスタイリッシュな通知に変更可能）
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// グラフを更新
updateCharts = function() {
    updateLineChart();
    updatePieChart();
    updateBalanceChart();
}

// 月別収支推移グラフ
updateLineChart = function() {
    const ctx = document.getElementById('lineChart');
    const chartTitle = document.getElementById('chart-title');
    
    if (currentChartView === 'daily') {
        const weekText = currentWeekOffset === 0 ? '今週' : 
                        currentWeekOffset === 1 ? '先週' :
                        currentWeekOffset > 1 ? `${currentWeekOffset}週間前` :
                        `${Math.abs(currentWeekOffset)}週間後`;
        chartTitle.textContent = `日別収支推移（${weekText}）`;
        updateDailyLineChart(ctx);
    } else {
        chartTitle.textContent = '月別収支推移（過去6ヶ月）';
        updateMonthlyLineChart(ctx);
    }
}

// 日別グラフ
const updateDailyLineChart = function(ctx) {
    const labels = [];
    const incomeData = [];
    const expenseData = [];
    const balanceData = [];
    
    const today = new Date();
    
    // 現在のオフセットに基づいて7日間のデータを準備
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - (currentWeekOffset * 7) - i);
        const key = `${date.getMonth() + 1}/${date.getDate()}`;
        const fullKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        labels.push(key);
        
        let income = 0;
        let expense = 0;
        
        transactions.forEach(t => {
            if (t.date === fullKey) {
                if (t.type === 'income') {
                    income += t.amount;
                } else {
                    expense += t.amount;
                }
            }
        });
        
        incomeData.push(income);
        expenseData.push(expense);
        balanceData.push(income - expense);
    }
    
    // Y軸の範囲を計算（余裕を持たせる）
    const maxValue = Math.max(...balanceData);
    const minValue = Math.min(...balanceData);
    const absMax = Math.max(Math.abs(maxValue), Math.abs(minValue));
    const yAxisMax = absMax * 1.2; // 20%の余裕を持たせる
    
    // 既存のグラフを破棄
    if (lineChart) {
        lineChart.destroy();
    }
    
    // 新しいグラフを作成
    lineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '収支',
                    data: balanceData,
                    borderColor: '#667eea',
                    backgroundColor: function(context) {
                        const value = context.raw;
                        return value >= 0 ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)';
                    },
                    tension: 0.4,
                    fill: true,
                    segment: {
                        borderColor: function(context) {
                            const value = context.p1.parsed.y;
                            return value >= 0 ? '#28a745' : '#dc3545';
                        }
                    },
                    pointBackgroundColor: function(context) {
                        const value = context.parsed.y;
                        return value >= 0 ? '#28a745' : '#dc3545';
                    },
                    pointBorderColor: function(context) {
                        const value = context.parsed.y;
                        return value >= 0 ? '#28a745' : '#dc3545';
                    },
                    pointRadius: 3,
                    pointHoverRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            return `収支: ${value >= 0 ? '+' : ''}¥${value.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    min: -yAxisMax,
                    max: yAxisMax,
                    ticks: {
                        callback: function(value) {
                            return (value >= 0 ? '+' : '') + '¥' + value.toLocaleString();
                        }
                    },
                    grid: {
                        color: function(context) {
                            if (context.tick.value === 0) {
                                return '#000';
                            }
                            return 'rgba(0, 0, 0, 0.1)';
                        },
                        lineWidth: function(context) {
                            if (context.tick.value === 0) {
                                return 2;
                            }
                            return 1;
                        }
                    }
                }
            }
        }
    });
}

// 月別グラフ
const updateMonthlyLineChart = function(ctx) {
    // 過去6ヶ月のデータを準備
    const monthsData = {};
    const today = new Date();
    
    // 過去6ヶ月のラベルを作成
    for (let i = 5; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const key = `${date.getFullYear()}/${date.getMonth() + 1}`;
        monthsData[key] = { income: 0, expense: 0 };
    }
    
    // 取引データを集計
    transactions.forEach(t => {
        const date = new Date(t.date);
        const key = `${date.getFullYear()}/${date.getMonth() + 1}`;
        if (monthsData[key]) {
            if (t.type === 'income') {
                monthsData[key].income += t.amount;
            } else {
                monthsData[key].expense += t.amount;
            }
        }
    });
    
    const labels = Object.keys(monthsData);
    const balanceData = Object.values(monthsData).map(d => d.income - d.expense); // 収支（収入-支出）
    
    // Y軸の範囲を計算（余裕を持たせる）
    const maxValue = Math.max(...balanceData);
    const minValue = Math.min(...balanceData);
    const absMax = Math.max(Math.abs(maxValue), Math.abs(minValue));
    const yAxisMax = absMax * 1.2; // 20%の余裕を持たせる
    
    // 既存のグラフを破棄
    if (lineChart) {
        lineChart.destroy();
    }
    
    // 新しいグラフを作成
    lineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '収支',
                    data: balanceData,
                    borderColor: '#667eea',
                    backgroundColor: function(context) {
                        const value = context.raw;
                        return value >= 0 ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)';
                    },
                    tension: 0.4,
                    fill: true,
                    segment: {
                        borderColor: function(context) {
                            const value = context.p1.parsed.y;
                            return value >= 0 ? '#28a745' : '#dc3545';
                        }
                    },
                    pointBackgroundColor: function(context) {
                        const value = context.parsed.y;
                        return value >= 0 ? '#28a745' : '#dc3545';
                    },
                    pointBorderColor: function(context) {
                        const value = context.parsed.y;
                        return value >= 0 ? '#28a745' : '#dc3545';
                    },
                    pointRadius: 3,
                    pointHoverRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            return `収支: ${value >= 0 ? '+' : ''}¥${value.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    min: -yAxisMax,
                    max: yAxisMax,
                    ticks: {
                        callback: function(value) {
                            return (value >= 0 ? '+' : '') + '¥' + value.toLocaleString();
                        }
                    },
                    grid: {
                        color: function(context) {
                            if (context.tick.value === 0) {
                                return '#000';
                            }
                            return 'rgba(0, 0, 0, 0.1)';
                        },
                        lineWidth: function(context) {
                            if (context.tick.value === 0) {
                                return 2;
                            }
                            return 1;
                        }
                    }
                }
            }
        }
    });
}

// カテゴリ別支出円グラフ
updatePieChart = function() {
    const ctx = document.getElementById('pieChart');
    
    // カテゴリ別に支出を集計
    const categoryData = {};
    transactions.forEach(t => {
        if (t.type === 'expense') {
            if (!categoryData[t.category]) {
                categoryData[t.category] = 0;
            }
            categoryData[t.category] += t.amount;
        }
    });
    
    const labels = Object.keys(categoryData);
    const data = Object.values(categoryData);
    
    // パステルカラーパレット
    const colors = [
        '#ffcdd2',
        '#f8bbd0',
        '#e1bee7',
        '#d1c4e9',
        '#c5cae9',
        '#bbdefb',
        '#b3e5fc',
        '#b2dfdb',
        '#c8e6c9',
        '#dcedc8',
        '#f0f4c3',
        '#fff9c4',
        '#ffecb3',
        '#ffe0b2',
        '#ffccbc',
        '#d7ccc8'
    ];
    
    // 既存のグラフを破棄
    if (pieChart) {
        pieChart.destroy();
    }
    
    // データがない場合
    if (data.length === 0) {
        pieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['データなし'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#e0e0e0']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        return;
    }
    
    // 新しいグラフを作成
    pieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length)
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ¥${value.toLocaleString()} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// 残高推移グラフ
updateBalanceChart = function() {
    const ctx = document.getElementById('balanceChart');
    
    // 過去2週間のデータを準備
    const daysData = {};
    const today = new Date();
    
    // 過去2週間のラベルを作成
    for (let i = 13; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const key = `${date.getMonth() + 1}/${date.getDate()}`;
        const fullKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        daysData[key] = { fullKey: fullKey, income: 0, expense: 0 };
    }
    
    // 取引データを集計
    transactions.forEach(t => {
        Object.keys(daysData).forEach(k => {
            if (daysData[k].fullKey === t.date) {
                if (t.type === 'income') {
                    daysData[k].income += t.amount;
                } else {
                    daysData[k].expense += t.amount;
                }
            }
        });
    });
    
    const labels = Object.keys(daysData);
    
    // 累積残高を計算
    let cumulativeBalance = 0;
    const balanceData = [];
    
    Object.values(daysData).forEach(d => {
        cumulativeBalance += (d.income - d.expense);
        balanceData.push(cumulativeBalance);
    });
    
    // 既存のグラフを破棄
    if (balanceChart) {
        balanceChart.destroy();
    }
    
    // 新しいグラフを作成
    balanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '残高',
                    data: balanceData,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            return `残高: ¥${value.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: function(value) {
                            return '¥' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// アニメーション用CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

    // 初回のUI更新とカレンダー描画
    updateUI();
    renderCalendar();
}

// カレンダーを描画
renderCalendar = function() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // 月の表示を更新
    document.getElementById('calendar-month').textContent = `${year}年${month + 1}月`;
    
    const calendarGrid = document.getElementById('calendar-grid');
    calendarGrid.innerHTML = '';
    
    // 曜日ヘッダーを追加
    const dayHeaders = ['日', '月', '火', '水', '木', '金', '土'];
    dayHeaders.forEach((day, index) => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        if (index === 0) header.style.color = '#dc3545'; // 日曜日を赤に
        if (index === 6) header.style.color = '#007bff'; // 土曜日を青に
        calendarGrid.appendChild(header);
    });
    
    // 月の最初の日と最後の日を取得
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    // 前月の日付を表示
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonthLastDay - i;
        const dayEl = createCalendarDay(day, year, month - 1, true);
        calendarGrid.appendChild(dayEl);
    }
    
    // 当月の日付を表示
    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = createCalendarDay(day, year, month, false);
        calendarGrid.appendChild(dayEl);
    }
    
    // 次月の日付を表示（グリッドを埋めるため）
    const remainingCells = 42 - (firstDayOfWeek + daysInMonth); // 6週間分
    for (let day = 1; day <= remainingCells; day++) {
        const dayEl = createCalendarDay(day, year, month + 1, true);
        calendarGrid.appendChild(dayEl);
    }
    
    // 選択日の取引を表示
    displayDayTransactions(selectedDate);
}

// カレンダーの日付セルを作成
createCalendarDay = function(day, year, month, isOtherMonth) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    if (isOtherMonth) dayEl.classList.add('other-month');
    
    const date = new Date(year, month, day);
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    // 今日かチェック
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
        dayEl.classList.add('today');
    }
    
    // 選択日かチェック
    if (date.toDateString() === selectedDate.toDateString()) {
        dayEl.classList.add('selected');
    }
    
    // その日の取引を集計
    const dayTransactions = transactions.filter(t => t.date === dateString);
    const dayIncome = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const dayExpense = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const dayBalance = dayIncome - dayExpense;
    
    // 取引がある場合は表示
    if (dayTransactions.length > 0) {
        dayEl.classList.add('has-transaction');
        // 収支がプラスなら緑、マイナスなら赤
        if (dayBalance >= 0) {
            dayEl.classList.add('has-income');
        } else {
            dayEl.classList.add('has-expense');
        }
    }
    
    dayEl.innerHTML = `
        <div class="calendar-day-number">${day}</div>
        ${dayBalance !== 0 ? `<div class="calendar-day-amount" style="color: ${dayBalance > 0 ? '#28a745' : '#dc3545'}">¥${Math.abs(dayBalance).toLocaleString()}</div>` : ''}
    `;
    
    // クリックイベント
    dayEl.addEventListener('click', () => {
        selectedDate = date;
        renderCalendar();
    });
    
    return dayEl;
}

// 選択日の取引を表示
displayDayTransactions = function(date) {
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const dayTransactions = transactions.filter(t => t.date === dateString);
    
    // タイトルを更新
    const title = document.getElementById('selected-day-title');
    const month = date.getMonth() + 1;
    const day = date.getDate();
    title.textContent = `${month}月${day}日の取引`;
    
    // 収支サマリーを計算
    let dayIncome = 0;
    let dayExpense = 0;
    
    dayTransactions.forEach(t => {
        if (t.type === 'income') {
            dayIncome += t.amount;
        } else {
            dayExpense += t.amount;
        }
    });
    
    const dayBalance = dayIncome - dayExpense;
    
    // サマリーを更新
    const dayIncomeEl = document.getElementById('day-income');
    const dayExpenseEl = document.getElementById('day-expense');
    const dayBalanceEl = document.getElementById('day-balance');
    
    if (dayIncomeEl) dayIncomeEl.textContent = `¥${dayIncome.toLocaleString()}`;
    if (dayExpenseEl) dayExpenseEl.textContent = `¥${dayExpense.toLocaleString()}`;
    if (dayBalanceEl) {
        dayBalanceEl.textContent = `¥${dayBalance.toLocaleString()}`;
        dayBalanceEl.className = 'day-summary-value balance-text';
        if (dayBalance > 0) {
            dayBalanceEl.classList.add('positive');
        } else if (dayBalance < 0) {
            dayBalanceEl.classList.add('negative');
        }
    }
    
    const list = document.getElementById('day-transaction-list');
    list.innerHTML = '';
    
    if (dayTransactions.length === 0) {
        list.innerHTML = '<li class="empty-message">取引がありません</li>';
        return;
    }
    
    // 時系列順にソート
    dayTransactions.sort((a, b) => b.id - a.id);
    
    dayTransactions.forEach(transaction => {
        const li = document.createElement('li');
        li.className = `transaction-item ${transaction.type}`;
        
        const sign = transaction.type === 'income' ? '+' : '-';
        
        li.innerHTML = `
            <div class="transaction-info">
                <div class="transaction-description">${transaction.description}</div>
                <div class="transaction-details">${transaction.category}</div>
            </div>
            <div class="transaction-amount ${transaction.type}">
                ${sign}${formatCurrency(transaction.amount)}
            </div>
            <div class="transaction-actions">
                <button class="btn-edit" onclick="editTransaction(${transaction.id})">
                    編集
                </button>
                <button class="btn-delete" onclick="deleteTransaction(${transaction.id})">
                    削除
                </button>
            </div>
        `;
        
        list.appendChild(li);
    });
}

// 予算管理
let monthlyBudget = 0;
let payday = null;
let categoryBudgets = {};

// 予算表示を更新
updateBudgetDisplay = function() {
    // 今月の支出合計を計算
    const today = new Date();
    const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    let monthlyExpense = 0;
    const categoryExpenses = {};
    
    transactions.forEach(t => {
        if (t.date.startsWith(thisMonth) && t.type === 'expense') {
            monthlyExpense += t.amount;
            categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + t.amount;
        }
    });
    
    // 予算情報を更新
    if (monthlyBudget === 0) {
        document.getElementById('budget-amount').textContent = '未設定';
        document.getElementById('used-amount').textContent = `¥${monthlyExpense.toLocaleString()}`;
        document.getElementById('remaining-amount').textContent = '―';
    } else {
        document.getElementById('budget-amount').textContent = `¥${monthlyBudget.toLocaleString()}`;
        document.getElementById('used-amount').textContent = `¥${monthlyExpense.toLocaleString()}`;
        document.getElementById('remaining-amount').textContent = `¥${(monthlyBudget - monthlyExpense).toLocaleString()}`;
    }
    
    // プログレスバーを更新
    const percentage = monthlyBudget > 0 ? (monthlyExpense / monthlyBudget) * 100 : 0;
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    progressFill.style.width = `${Math.min(percentage, 100)}%`;
    
    if (monthlyBudget === 0) {
        progressText.textContent = '予算が未設定です';
    } else {
        progressText.textContent = `予算の${percentage.toFixed(1)}%を使用中`;
    }
    
    // 色を変更
    progressFill.className = 'progress-fill';
    if (percentage >= 100) {
        progressFill.classList.add('danger');
    } else if (percentage >= 80) {
        progressFill.classList.add('warning');
    }
    
    // カテゴリ別使用状況を表示
    const categoryList = document.getElementById('category-budget-list');
    categoryList.innerHTML = '';
    
    // 支出があるカテゴリまたは予算設定があるカテゴリを表示
    const allCategories = new Set([...Object.keys(categoryExpenses), ...Object.keys(categoryBudgets)]);
    
    allCategories.forEach(category => {
        const amount = categoryExpenses[category] || 0;
        const categoryBudget = categoryBudgets[category] || 0;
        const categoryPercentage = categoryBudget > 0 ? (amount / categoryBudget) * 100 : 0;
        
        const item = document.createElement('div');
        item.className = 'category-budget-item';
        
        let statusClass = '';
        if (categoryBudget > 0) {
            if (categoryPercentage >= 100) statusClass = 'danger';
            else if (categoryPercentage >= 80) statusClass = 'warning';
        }
        
        item.innerHTML = `
            <div class="category-header">
                <h4>${category}</h4>
                <div class="category-amounts">
                    <span class="category-used">¥${amount.toLocaleString()}</span>
                    ${categoryBudget > 0 ? `<span class="category-budget-text">/ ¥${categoryBudget.toLocaleString()}</span>` : '<span class="no-budget">予算未設定</span>'}
                </div>
            </div>
            ${categoryBudget > 0 ? `
            <div class="progress-bar">
                <div class="progress-fill ${statusClass}" style="width: ${Math.min(categoryPercentage, 100)}%"></div>
            </div>
            <p class="category-percent">${categoryPercentage.toFixed(1)}%</p>
            ` : ''}
        `;
        categoryList.appendChild(item);
    });
};

// 予算データを読み込む
loadBudget = function() {
    if (!currentUser) return;
    
    // 全体予算と給料日を読み込み
    database.ref('users/' + currentUser.uid + '/budget').once('value', (snapshot) => {
        const budgetData = snapshot.val();
        if (budgetData) {
            if (budgetData.monthly) {
                monthlyBudget = budgetData.monthly;
                document.getElementById('monthly-budget').value = monthlyBudget;
            }
            if (budgetData.payday) {
                payday = budgetData.payday;
                // カレンダー用に日付形式で設定（今月の給料日）
                const today = new Date();
                const paydayDate = new Date(today.getFullYear(), today.getMonth(), payday);
                document.getElementById('payday').value = paydayDate.toISOString().split('T')[0];
            }
            updateBudgetDisplay();
            updateDailyBudget();
        }
    });
    
    // カテゴリ別予算を読み込み
    database.ref('users/' + currentUser.uid + '/categoryBudgets').once('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            categoryBudgets = data;
            updateSetCategoryList();
            updateBudgetDisplay();
        }
    });
};

// 1日の使用可能金額を計算
const updateDailyBudget = function() {
    const dailyAmountEl = document.getElementById('daily-amount');
    const dailyInfoEl = document.getElementById('daily-info');
    
    if (!monthlyBudget && !payday) {
        dailyAmountEl.textContent = '―';
        dailyInfoEl.textContent = '予算と給料日を設定してください';
        dailyAmountEl.style.color = '#999';
        return;
    }
    
    if (!payday) {
        dailyAmountEl.textContent = '―';
        dailyInfoEl.textContent = '給料日を設定してください';
        dailyAmountEl.style.color = '#999';
        return;
    }
    
    // 現在の残高を計算（収入 - 支出）
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const balance = income - expense;
    
    const today = new Date();
    
    // 給料日までの日数を計算
    const currentDay = today.getDate();
    let daysUntilPayday;
    
    if (payday === 31) {
        // 月末の場合
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        if (currentDay <= lastDay) {
            daysUntilPayday = lastDay - currentDay + 1;
        } else {
            daysUntilPayday = 1;
        }
    } else {
        if (currentDay <= payday) {
            daysUntilPayday = payday - currentDay + 1;
        } else {
            // 次の月の給料日まで
            const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, payday);
            const diff = nextMonth - today;
            daysUntilPayday = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
        }
    }
    
    // 1日の使用可能金額（残高を給料日までの日数で割る）
    const dailyBudget = daysUntilPayday > 0 ? Math.floor(balance / daysUntilPayday) : 0;
    
    dailyAmountEl.textContent = `¥${dailyBudget.toLocaleString()}`;
    dailyInfoEl.textContent = `給料日まで${daysUntilPayday}日`;
    
    // 色を変更
    if (dailyBudget < 0 || dailyBudget <= 500) {
        dailyAmountEl.style.color = '#dc3545';
    } else if (dailyBudget < 1000) {
        dailyAmountEl.style.color = '#333';
    } else {
        dailyAmountEl.style.color = '#28a745';
    }
};
