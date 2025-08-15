import { db } from './firebase-config.js';
import { 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    deleteDoc,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

class MealPlannerApp {
    constructor() {
        this.currentPlanId = 'meal-plan-current';
        this.statusMessage = document.getElementById('status-message');
        this.initializeEventListeners();
        this.loadMealPlan();
    }

    initializeEventListeners() {
        document.getElementById('save-plan').addEventListener('click', () => this.saveMealPlan());
        document.getElementById('load-plan').addEventListener('click', () => this.loadMealPlan());
        document.getElementById('clear-plan').addEventListener('click', () => this.clearMealPlan());
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
        const mealPlan = {
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

    async saveMealPlan() {
        try {
            this.showStatus('献立を保存中...', 'loading');
            
            const mealPlan = this.getMealPlanData();
            const docRef = doc(db, 'mealPlans', this.currentPlanId);
            
            await setDoc(docRef, mealPlan);
            this.showStatus('献立が正常に保存されました！', 'success');
            
        } catch (error) {
            console.error('保存エラー:', error);
            this.showStatus('保存に失敗しました。もう一度お試しください。', 'error');
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
                this.showStatus('献立が正常に読み込まれました！', 'success');
            } else {
                this.showStatus('保存された献立が見つかりませんでした。', 'error');
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