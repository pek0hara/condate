import { db } from './firebase-init.js';
import { 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    deleteDoc,
    getDocs,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

class MealPlannerApp {
    constructor() {
        this.statusMessage = document.getElementById('status-message');
        this.currentPlanId = this.initializePlanId();
        this.currentPage = 'main';
        this.initializeDates();
        this.initializeEventListeners();
        this.loadMealPlan();
        this.loadMealSuggestions();
    }

    initializeDates() {
        this.today = new Date();
        this.updateDateDisplays();
    }

    updateDateDisplays() {
        const dates = this.getNext3Days();
        document.querySelector('[data-day="1"] h2').textContent = this.formatDate(dates[0]);
        document.querySelector('[data-day="2"] h2').textContent = this.formatDate(dates[1]);
        document.querySelector('[data-day="3"] h2').textContent = this.formatDate(dates[2]);
    }

    getNext3Days() {
        const dates = [];
        for (let i = 0; i < 3; i++) {
            const date = new Date(this.today);
            date.setDate(this.today.getDate() + i);
            dates.push(date);
        }
        return dates;
    }

    formatDate(date) {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        const weekday = weekdays[date.getDay()];
        return `${month}月${day}日(${weekday})`;
    }


    initializePlanId() {
        const urlParams = new URLSearchParams(window.location.search);
        let planId = urlParams.get('id');
        
        if (!planId) {
            planId = localStorage.getItem('currentMealPlanId');
        }
        
        if (!planId) {
            planId = this.generateNewPlanId();
            this.updateUrlWithId(planId);
        }
        
        localStorage.setItem('currentMealPlanId', planId);
        this.updatePageTitle(planId);
        
        return planId;
    }

    generateNewPlanId() {
        const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
        let id = '';
        for (let i = 0; i < 6; i++) {
            id += chars[Math.floor(Math.random() * chars.length)];
        }
        return id;
    }

    updateUrlWithId(planId) {
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('id', planId);
        window.history.replaceState({}, '', newUrl);
    }

    updatePageTitle(planId) {
        document.title = `献立アプリ - ${planId}`;
    }

    initializeEventListeners() {
        document.getElementById('save-plan').addEventListener('click', () => this.saveMealPlan());
        document.getElementById('share-plan').addEventListener('click', () => this.sharePlan());
        document.getElementById('history-btn').addEventListener('click', () => this.showHistory());
        document.getElementById('meals-btn').addEventListener('click', () => this.showMeals());
        document.getElementById('main-btn').addEventListener('click', () => this.showMain());
        
        // 献立管理関連
        document.getElementById('add-meal-btn').addEventListener('click', () => this.showMealModal());
        document.getElementById('close-modal').addEventListener('click', () => this.hideMealModal());
        document.getElementById('cancel-meal').addEventListener('click', () => this.hideMealModal());
        document.getElementById('meal-form').addEventListener('submit', (e) => this.handleMealSubmit(e));
        
        // モーダルの外側クリックで閉じる
        document.getElementById('meal-modal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('meal-modal')) {
                this.hideMealModal();
            }
        });
        
        // ページフォーカス時に日付チェック
        window.addEventListener('focus', () => {
            this.checkCurrentDateAndMigrate();
        });
    }

    showStatus(message, type = 'success') {
        this.statusMessage.textContent = message;
        this.statusMessage.className = `status-message ${type}`;
        
        if (type !== 'loading') {
            setTimeout(() => {
                this.statusMessage.textContent = '';
                this.statusMessage.className = 'status-message';
            }, 3000);
        }
    }

    getMealPlanData() {
        const dates = this.getNext3Days();
        const mealPlan = {
            planId: this.currentPlanId,
            lastUpdated: serverTimestamp(),
            meals: {}
        };
        
        // 日付をキーとして献立データを保存
        dates.forEach((date, index) => {
            const dateStr = date.toISOString().split('T')[0];
            mealPlan.meals[dateStr] = {
                date: dateStr,
                breakfast: document.getElementById(`breakfast-${index + 1}`).value,
                lunch: document.getElementById(`lunch-${index + 1}`).value,
                dinner: document.getElementById(`dinner-${index + 1}`).value
            };
        });
        
        return mealPlan;
    }

    setMealPlanData(mealPlan) {
        if (!mealPlan || !mealPlan.meals) return;

        const setInputValue = (id, value) => {
            const input = document.getElementById(id);
            if (input) {
                input.value = value || '';
            }
        };

        const dates = this.getNext3Days();
        dates.forEach((date, index) => {
            const dateStr = date.toISOString().split('T')[0];
            const mealData = mealPlan.meals[dateStr];
            
            if (mealData) {
                setInputValue(`breakfast-${index + 1}`, mealData.breakfast);
                setInputValue(`lunch-${index + 1}`, mealData.lunch);
                setInputValue(`dinner-${index + 1}`, mealData.dinner);
            } else {
                setInputValue(`breakfast-${index + 1}`, '');
                setInputValue(`lunch-${index + 1}`, '');
                setInputValue(`dinner-${index + 1}`, '');
            }
        });
    }

    clearAllInputs() {
        const inputs = document.querySelectorAll('input[type="text"]');
        inputs.forEach(input => {
            input.value = '';
        });
    }

    async saveMealPlan(silent = false) {
        try {
            if (!silent) {
                this.showStatus('献立を保存中...', 'loading');
            }
            
            const mealPlan = this.getMealPlanData();
            const docRef = doc(db, 'mealPlans', this.currentPlanId);
            
            await setDoc(docRef, mealPlan);
            
            if (!silent) {
                this.showStatus(`献立が正常に保存されました！ (ID: ${this.currentPlanId})`, 'success');
            }
            
        } catch (error) {
            console.error('保存エラー:', error);
            if (!silent) {
                this.showStatus('保存に失敗しました。もう一度お試しください。', 'error');
            }
        }
    }

    async loadMealPlan() {
        try {
            this.showStatus('献立を読み込み中...', 'loading');
            
            // まず日付チェックを実行
            await this.checkCurrentDateAndMigrate();
            
            const docRef = doc(db, 'mealPlans', this.currentPlanId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const mealPlan = docSnap.data();
                
                // 日付ベースのデータ構造かチェック
                if (mealPlan.meals) {
                    // 新しい形式
                    await this.checkAndMigratePastMeals(mealPlan);
                    this.setMealPlanData(mealPlan);
                } else {
                    // 古い形式からの移行
                    await this.migrateLegacyData(mealPlan);
                }
                
                this.showStatus(`献立が正常に読み込まれました！ (ID: ${this.currentPlanId})`, 'success');
            } else {
                this.showStatus(`保存された献立が見つかりませんでした。新しい献立を作成してください。 (ID: ${this.currentPlanId})`, 'info');
            }
            
        } catch (error) {
            console.error('読み込みエラー:', error);
            this.showStatus('読み込みに失敗しました。もう一度お試しください。', 'error');
        }
    }

    async clearMealPlan() {
        if (confirm('献立をクリアしますか？この操作は取り消せません。')) {
            try {
                this.showStatus('献立をクリア中...', 'loading');
                
                this.clearAllInputs();
                
                const docRef = doc(db, 'mealPlans', this.currentPlanId);
                await deleteDoc(docRef);
                
                this.showStatus('献立がクリアされました。', 'success');
                
            } catch (error) {
                console.error('クリアエラー:', error);
                this.clearAllInputs();
                this.showStatus('フォームはクリアされましたが、データベースの削除に失敗しました。', 'error');
            }
        }
    }

    async updateMealPlan(updatedData) {
        try {
            const docRef = doc(db, 'mealPlans', this.currentPlanId);
            await updateDoc(docRef, {
                ...updatedData,
                lastUpdated: serverTimestamp()
            });
            
            return true;
        } catch (error) {
            console.error('更新エラー:', error);
            return false;
        }
    }

    async checkAndMigratePastMeals(mealPlan) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const currentDates = this.getNext3Days();
            const currentDateStrs = currentDates.map(date => date.toISOString().split('T')[0]);
            
            // 過去の日付の献立を履歴に移動
            const pastMeals = {};
            for (const [dateStr, mealData] of Object.entries(mealPlan.meals)) {
                const mealDate = new Date(dateStr);
                mealDate.setHours(0, 0, 0, 0);
                
                if (mealDate < today && !currentDateStrs.includes(dateStr)) {
                    // 過去の日付で現在の3日間に含まれない
                    await this.saveMealToHistory(dateStr, mealData);
                    pastMeals[dateStr] = mealData;
                }
            }
            
            // 過去の献立をmealPlanから削除
            for (const dateStr of Object.keys(pastMeals)) {
                delete mealPlan.meals[dateStr];
            }
            
            // 更新されたmealPlanを保存
            if (Object.keys(pastMeals).length > 0) {
                await this.saveMealPlan(true);
                console.log(`${Object.keys(pastMeals).length}日分の過去の献立を履歴に移動しました`);
            }
            
        } catch (error) {
            console.error('過去の献立移行エラー:', error);
        }
    }

    async migrateLegacyData(legacyMealPlan) {
        try {
            // 古い形式から新しい形式に変換
            const newMealPlan = {
                planId: this.currentPlanId,
                lastUpdated: serverTimestamp(),
                meals: {}
            };
            
            if (legacyMealPlan.dates) {
                // 古い形式のデータがある場合
                const oldDates = [
                    legacyMealPlan.dates.day1,
                    legacyMealPlan.dates.day2,
                    legacyMealPlan.dates.day3
                ];
                
                oldDates.forEach((dateStr, index) => {
                    const dayKey = `day${index + 1}`;
                    if (legacyMealPlan[dayKey]) {
                        newMealPlan.meals[dateStr] = {
                            date: dateStr,
                            breakfast: legacyMealPlan[dayKey].breakfast || '',
                            lunch: legacyMealPlan[dayKey].lunch || '',
                            dinner: legacyMealPlan[dayKey].dinner || ''
                        };
                    }
                });
            }
            
            // 新しい形式で保存
            const docRef = doc(db, 'mealPlans', this.currentPlanId);
            await setDoc(docRef, newMealPlan);
            
            // 過去の献立があれば履歴に移動
            await this.checkAndMigratePastMeals(newMealPlan);
            this.setMealPlanData(newMealPlan);
            
        } catch (error) {
            console.error('レガシーデータ移行エラー:', error);
        }
    }

    async saveMealToHistory(dateStr, mealData) {
        try {
            const historyId = `history-${this.currentPlanId}-${dateStr}`;
            const date = new Date(dateStr);
            
            const historyData = {
                planId: this.currentPlanId,
                date: dateStr,
                dateFormatted: this.formatDate(date),
                breakfast: mealData.breakfast || '',
                lunch: mealData.lunch || '',
                dinner: mealData.dinner || '',
                savedAt: serverTimestamp()
            };
            
            const historyRef = doc(db, 'dailyMealHistory', historyId);
            await setDoc(historyRef, historyData);
        } catch (error) {
            console.error('履歴保存エラー:', error);
        }
    }

    showHistory() {
        this.currentPage = 'history';
        document.getElementById('main-content').style.display = 'none';
        document.getElementById('meals-content').style.display = 'none';
        document.getElementById('history-content').style.display = 'block';
        this.setActiveNavButton('history-btn');
        this.loadHistory();
    }

    showMain() {
        this.currentPage = 'main';
        document.getElementById('main-content').style.display = 'block';
        document.getElementById('meals-content').style.display = 'none';
        document.getElementById('history-content').style.display = 'none';
        this.setActiveNavButton('main-btn');
    }

    showMeals() {
        this.currentPage = 'meals';
        document.getElementById('main-content').style.display = 'none';
        document.getElementById('meals-content').style.display = 'block';
        document.getElementById('history-content').style.display = 'none';
        this.setActiveNavButton('meals-btn');
        this.loadMeals();
    }

    setActiveNavButton(activeId) {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(activeId).classList.add('active');
    }

    async loadHistory() {
        try {
            this.showStatus('履歴を読み込み中...', 'loading');
            
            const historyQuery = collection(db, 'dailyMealHistory');
            const querySnapshot = await getDocs(historyQuery);
            
            const historyData = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.planId === this.currentPlanId) {
                    historyData.push({ id: doc.id, ...data });
                }
            });

            historyData.sort((a, b) => new Date(b.date) - new Date(a.date));
            this.displayHistory(historyData);
            
        } catch (error) {
            console.error('履歴読み込みエラー:', error);
            this.showStatus('履歴の読み込みに失敗しました。', 'error');
        }
    }

    displayHistory(historyData) {
        const historyContainer = document.getElementById('history-list');
        
        if (historyData.length === 0) {
            historyContainer.innerHTML = '<p class="no-history">履歴がありません。</p>';
            this.showStatus('履歴がありません。', 'info');
            return;
        }

        historyContainer.innerHTML = historyData.map(entry => {
            return `
                <div class="history-entry">
                    <div class="history-period">
                        ${entry.dateFormatted}
                    </div>
                    <div class="history-meals">
                        <div class="history-day">
                            <div>朝: ${entry.breakfast || 'なし'}</div>
                            <div>昼: ${entry.lunch || 'なし'}</div>
                            <div>夜: ${entry.dinner || 'なし'}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        this.showStatus(`履歴を${historyData.length}件読み込みました。`, 'success');
    }

    createNewPlan() {
        const newId = this.generateNewPlanId();
        this.currentPlanId = newId;
        localStorage.setItem('currentMealPlanId', newId);
        this.updateUrlWithId(newId);
        this.updatePageTitle(newId);
        this.clearAllInputs();
        this.showStatus(`新しい献立を作成しました！ (ID: ${newId})`, 'success');
    }

    sharePlan() {
        const baseUrl = window.location.origin + window.location.pathname;
        const shareUrl = `${baseUrl}?id=${this.currentPlanId}`;
        
        if (navigator.share) {
            navigator.share({
                title: document.title,
                url: shareUrl
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(shareUrl).then(() => {
                this.showStatus('URLをクリップボードにコピーしました！', 'success');
            }).catch(() => {
                prompt('この URLをコピーしてシェアしてください:', shareUrl);
            });
        }
    }

    // 献立管理機能
    async loadMeals() {
        try {
            this.showStatus('献立を読み込み中...', 'loading');
            
            const mealsQuery = collection(db, 'meals');
            const querySnapshot = await getDocs(mealsQuery);
            
            const mealsData = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.userId === this.currentPlanId) {
                    mealsData.push({ id: doc.id, ...data });
                }
            });

            this.displayMeals(mealsData);
            
        } catch (error) {
            console.error('献立読み込みエラー:', error);
            this.showStatus('献立の読み込みに失敗しました。', 'error');
        }
    }

    displayMeals(mealsData) {
        const mealsContainer = document.getElementById('meals-list');
        
        if (mealsData.length === 0) {
            mealsContainer.innerHTML = '<p class="no-meals">登録された献立がありません。<br>「新しい献立を追加」ボタンから献立を登録してください。</p>';
            this.showStatus('献立がありません。', 'info');
            return;
        }

        const mealsGrid = `
            <div class="meals-grid">
                ${mealsData.map(meal => this.createMealCard(meal)).join('')}
            </div>
        `;

        mealsContainer.innerHTML = mealsGrid;
        this.addMealCardListeners();
        this.showStatus(`${mealsData.length}件の献立を読み込みました。`, 'success');
    }

    createMealCard(meal) {
        const categoryNames = {
            breakfast: '朝食',
            lunch: '昼食', 
            dinner: '夕食'
        };

        const categories = Array.isArray(meal.categories) ? meal.categories : [meal.category].filter(Boolean);
        const categoryTags = categories.map(cat => 
            `<span class="meal-category ${cat}">${categoryNames[cat]}</span>`
        ).join('');

        return `
            <div class="meal-card" data-meal-id="${meal.id}">
                <h3>${meal.name}</h3>
                <div class="meal-categories">${categoryTags}</div>
                <div class="meal-memo">${meal.memo || 'メモなし'}</div>
                <div class="meal-actions">
                    <button class="btn btn-info btn-small edit-meal" data-meal-id="${meal.id}">編集</button>
                    <button class="btn btn-danger btn-small delete-meal" data-meal-id="${meal.id}">削除</button>
                </div>
            </div>
        `;
    }

    addMealCardListeners() {
        document.querySelectorAll('.edit-meal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mealId = e.target.dataset.mealId;
                this.editMeal(mealId);
            });
        });

        document.querySelectorAll('.delete-meal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mealId = e.target.dataset.mealId;
                this.deleteMeal(mealId);
            });
        });
    }

    showMealModal(meal = null) {
        this.currentEditingMeal = meal;
        const modal = document.getElementById('meal-modal');
        const title = document.getElementById('modal-title');
        
        // チェックボックスをリセット
        document.querySelectorAll('.category-checkboxes input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        if (meal) {
            title.textContent = '献立を編集';
            document.getElementById('meal-name').value = meal.name;
            document.getElementById('meal-memo').value = meal.memo || '';
            
            // カテゴリの設定（新旧両方の形式に対応）
            const categories = Array.isArray(meal.categories) ? meal.categories : [meal.category].filter(Boolean);
            categories.forEach(category => {
                const checkbox = document.getElementById(`category-${category}`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
        } else {
            title.textContent = '新しい献立を追加';
            document.getElementById('meal-form').reset();
        }
        
        modal.style.display = 'block';
    }

    hideMealModal() {
        document.getElementById('meal-modal').style.display = 'none';
        this.currentEditingMeal = null;
    }

    async handleMealSubmit(e) {
        e.preventDefault();
        
        const name = document.getElementById('meal-name').value.trim();
        const memo = document.getElementById('meal-memo').value.trim();
        
        // 選択されたカテゴリを取得
        const categories = Array.from(document.querySelectorAll('.category-checkboxes input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);
        
        if (!name) {
            this.showStatus('献立名を入力してください。', 'error');
            return;
        }

        if (categories.length === 0) {
            this.showStatus('カテゴリを選択してください。', 'error');
            return;
        }

        try {
            this.showStatus('保存中...', 'loading');
            
            const mealData = {
                name,
                categories,
                memo,
                userId: this.currentPlanId,
                updatedAt: serverTimestamp()
            };

            if (this.currentEditingMeal) {
                // 編集
                const docRef = doc(db, 'meals', this.currentEditingMeal.id);
                await updateDoc(docRef, mealData);
                this.showStatus('献立を更新しました。', 'success');
            } else {
                // 新規追加
                mealData.createdAt = serverTimestamp();
                const docRef = doc(collection(db, 'meals'));
                await setDoc(docRef, mealData);
                this.showStatus('献立を追加しました。', 'success');
            }

            this.hideMealModal();
            this.loadMeals();
            this.loadMealSuggestions(); // 献立入力の候補を更新
            
        } catch (error) {
            console.error('献立保存エラー:', error);
            this.showStatus('保存に失敗しました。', 'error');
        }
    }

    async editMeal(mealId) {
        try {
            const docRef = doc(db, 'meals', mealId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const mealData = { id: mealId, ...docSnap.data() };
                this.showMealModal(mealData);
            }
        } catch (error) {
            console.error('献立取得エラー:', error);
            this.showStatus('献立の取得に失敗しました。', 'error');
        }
    }

    async deleteMeal(mealId) {
        if (!confirm('この献立を削除しますか？')) {
            return;
        }

        try {
            this.showStatus('削除中...', 'loading');
            
            const docRef = doc(db, 'meals', mealId);
            await deleteDoc(docRef);
            
            this.showStatus('献立を削除しました。', 'success');
            this.loadMeals();
            this.loadMealSuggestions(); // 献立入力の候補を更新
            
        } catch (error) {
            console.error('献立削除エラー:', error);
            this.showStatus('削除に失敗しました。', 'error');
        }
    }

    async loadMealSuggestions() {
        try {
            const mealsQuery = collection(db, 'meals');
            const querySnapshot = await getDocs(mealsQuery);
            
            const mealsByCategory = {
                breakfast: new Set(),
                lunch: new Set(),
                dinner: new Set()
            };

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.userId === this.currentPlanId) {
                    // 新しい形式（複数カテゴリ）
                    if (Array.isArray(data.categories)) {
                        data.categories.forEach(category => {
                            if (mealsByCategory[category]) {
                                mealsByCategory[category].add(data.name);
                            }
                        });
                    }
                    // 旧形式（単一カテゴリ）も対応
                    else if (data.category && mealsByCategory[data.category]) {
                        mealsByCategory[data.category].add(data.name);
                    }
                }
            });

            // SetをArrayに変換
            const mealsArrayByCategory = {
                breakfast: Array.from(mealsByCategory.breakfast),
                lunch: Array.from(mealsByCategory.lunch),
                dinner: Array.from(mealsByCategory.dinner)
            };

            this.updateDataLists(mealsArrayByCategory);
            
        } catch (error) {
            console.error('献立候補読み込みエラー:', error);
        }
    }

    updateDataLists(mealsByCategory) {
        const breakfastList = document.getElementById('breakfast-list');
        const lunchList = document.getElementById('lunch-list');
        const dinnerList = document.getElementById('dinner-list');

        breakfastList.innerHTML = mealsByCategory.breakfast.map(meal => 
            `<option value="${meal}"></option>`).join('');

        lunchList.innerHTML = mealsByCategory.lunch.map(meal => 
            `<option value="${meal}"></option>`).join('');

        dinnerList.innerHTML = mealsByCategory.dinner.map(meal => 
            `<option value="${meal}"></option>`).join('');
    }

    async checkCurrentDateAndMigrate() {
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        
        const storedDate = new Date(this.today);
        storedDate.setHours(0, 0, 0, 0);
        
        if (currentDate.getTime() !== storedDate.getTime()) {
            console.log('日付が変更されました:', this.formatDate(this.today), '→', this.formatDate(currentDate));
            
            // 日付を更新
            this.today = currentDate;
            
            // 日付表示を更新
            this.updateDateDisplays();
            
            // 過去の献立を履歴に移動
            await this.handleDateChange();
            
            return true; // 日付が変更された
        }
        
        return false; // 日付は変更されていない
    }

    async handleDateChange() {
        try {
            // 現在の献立データを読み込み
            const docRef = doc(db, 'mealPlans', this.currentPlanId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const mealPlan = docSnap.data();
                if (mealPlan.meals) {
                    // 過去の献立を履歴に移動
                    await this.checkAndMigratePastMeals(mealPlan);
                    
                    // 画面を更新
                    this.setMealPlanData(mealPlan);
                    
                    this.showStatus('日付が変更されました。過去の献立を履歴に移動しました。', 'info');
                }
            }
        } catch (error) {
            console.error('日付変更処理エラー:', error);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        const app = new MealPlannerApp();
    } catch (error) {
        console.error('アプリの初期化に失敗しました:', error);
        const statusElement = document.getElementById('status-message');
        if (statusElement) {
            statusElement.textContent = 'アプリの初期化に失敗しました。Firebase設定を確認してください。';
            statusElement.className = 'status-message error';
        }
    }
});

window.addEventListener('beforeunload', (event) => {
    const inputs = document.querySelectorAll('input[type="text"]');
    const hasUnsavedChanges = Array.from(inputs).some(input => input.value.trim() !== '');
    
    if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '変更が保存されていません。ページを離れますか？';
    }
});