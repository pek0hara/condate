import { db } from './firebase-config.js';
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
        this.checkForDateShift();
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
            dates: {
                day1: dates[0].toISOString().split('T')[0],
                day2: dates[1].toISOString().split('T')[0],
                day3: dates[2].toISOString().split('T')[0]
            },
            day1: {
                breakfast: document.getElementById('breakfast-1').value,
                lunch: document.getElementById('lunch-1').value,
                dinner: document.getElementById('dinner-1').value
            },
            day2: {
                breakfast: document.getElementById('breakfast-2').value,
                lunch: document.getElementById('lunch-2').value,
                dinner: document.getElementById('dinner-2').value
            },
            day3: {
                breakfast: document.getElementById('breakfast-3').value,
                lunch: document.getElementById('lunch-3').value,
                dinner: document.getElementById('dinner-3').value
            },
            lastUpdated: serverTimestamp()
        };
        return mealPlan;
    }

    setMealPlanData(mealPlan) {
        if (!mealPlan) return;

        const setInputValue = (id, value) => {
            const input = document.getElementById(id);
            if (input && value) {
                input.value = value;
            }
        };

        if (mealPlan.day1) {
            setInputValue('breakfast-1', mealPlan.day1.breakfast);
            setInputValue('lunch-1', mealPlan.day1.lunch);
            setInputValue('dinner-1', mealPlan.day1.dinner);
        }

        if (mealPlan.day2) {
            setInputValue('breakfast-2', mealPlan.day2.breakfast);
            setInputValue('lunch-2', mealPlan.day2.lunch);
            setInputValue('dinner-2', mealPlan.day2.dinner);
        }

        if (mealPlan.day3) {
            setInputValue('breakfast-3', mealPlan.day3.breakfast);
            setInputValue('lunch-3', mealPlan.day3.lunch);
            setInputValue('dinner-3', mealPlan.day3.dinner);
        }
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
            
            const docRef = doc(db, 'mealPlans', this.currentPlanId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const mealPlan = docSnap.data();
                this.setMealPlanData(mealPlan);
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

    async checkForDateShift() {
        try {
            const docRef = doc(db, 'mealPlans', this.currentPlanId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const mealPlan = docSnap.data();
                if (mealPlan.dates) {
                    const savedDay1 = new Date(mealPlan.dates.day1);
                    const currentDay1 = this.getNext3Days()[0];
                    
                    if (savedDay1.toDateString() !== currentDay1.toDateString()) {
                        await this.handleDateShift(mealPlan);
                    }
                }
            }
        } catch (error) {
            console.error('日付シフトチェックエラー:', error);
        }
    }

    async handleDateShift(oldMealPlan) {
        const oldDates = [
            new Date(oldMealPlan.dates.day1),
            new Date(oldMealPlan.dates.day2),
            new Date(oldMealPlan.dates.day3)
        ];

        await this.saveToHistory(oldMealPlan, oldDates);

        const currentDates = this.getNext3Days();
        const shiftedPlan = this.shiftMealPlan(oldMealPlan, oldDates, currentDates);
        
        this.setMealPlanData(shiftedPlan);
        await this.saveMealPlan(true);
        
        this.showStatus('日付が更新されました。過去の献立は履歴に保存されました。', 'info');
    }

    async saveToHistory(mealPlan, dates) {
        try {
            const historyId = `history-${this.currentPlanId}-${dates[0].toISOString().split('T')[0]}`;
            const historyData = {
                ...mealPlan,
                planId: this.currentPlanId,
                savedAt: serverTimestamp(),
                originalDates: {
                    day1: dates[0].toISOString().split('T')[0],
                    day2: dates[1].toISOString().split('T')[0],
                    day3: dates[2].toISOString().split('T')[0]
                }
            };
            
            const historyRef = doc(db, 'mealPlanHistory', historyId);
            await setDoc(historyRef, historyData);
        } catch (error) {
            console.error('履歴保存エラー:', error);
        }
    }

    shiftMealPlan(oldPlan, oldDates, newDates) {
        const shiftedPlan = {
            day1: { breakfast: '', lunch: '', dinner: '' },
            day2: { breakfast: '', lunch: '', dinner: '' },
            day3: { breakfast: '', lunch: '', dinner: '' }
        };

        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (oldDates[j].toDateString() === newDates[i].toDateString()) {
                    const dayKey = `day${i + 1}`;
                    const oldDayKey = `day${j + 1}`;
                    shiftedPlan[dayKey] = oldPlan[oldDayKey];
                    break;
                }
            }
        }

        return shiftedPlan;
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
            
            const historyQuery = collection(db, 'mealPlanHistory');
            const querySnapshot = await getDocs(historyQuery);
            
            const historyData = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.planId === this.currentPlanId) {
                    historyData.push({ id: doc.id, ...data });
                }
            });

            historyData.sort((a, b) => new Date(b.originalDates.day1) - new Date(a.originalDates.day1));
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
            const startDate = new Date(entry.originalDates.day1);
            const endDate = new Date(entry.originalDates.day3);
            
            return `
                <div class="history-entry">
                    <div class="history-period">
                        ${this.formatDate(startDate)} ～ ${this.formatDate(endDate)}
                    </div>
                    <div class="history-meals">
                        <div class="history-day">
                            <strong>${this.formatDate(startDate)}</strong>
                            <div>朝: ${entry.day1.breakfast || 'なし'}</div>
                            <div>昼: ${entry.day1.lunch || 'なし'}</div>
                            <div>夜: ${entry.day1.dinner || 'なし'}</div>
                        </div>
                        <div class="history-day">
                            <strong>${this.formatDate(new Date(entry.originalDates.day2))}</strong>
                            <div>朝: ${entry.day2.breakfast || 'なし'}</div>
                            <div>昼: ${entry.day2.lunch || 'なし'}</div>
                            <div>夜: ${entry.day2.dinner || 'なし'}</div>
                        </div>
                        <div class="history-day">
                            <strong>${this.formatDate(endDate)}</strong>
                            <div>朝: ${entry.day3.breakfast || 'なし'}</div>
                            <div>昼: ${entry.day3.lunch || 'なし'}</div>
                            <div>夜: ${entry.day3.dinner || 'なし'}</div>
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
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        const app = new MealPlannerApp();
        console.log('献立アプリが正常に初期化されました');
    } catch (error) {
        console.error('アプリの初期化に失敗しました:', error);
        document.getElementById('status-message').textContent = 'アプリの初期化に失敗しました。Firebase設定を確認してください。';
        document.getElementById('status-message').className = 'status-message error';
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