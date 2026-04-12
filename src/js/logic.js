/**
 * Nutri-Vision logic.js - Core Algorithms
 */
const METS_DB = {
    walking: 3.5,
    jogging: 7.0,
    cycling: 4.0,
    cleaning: 3.3,
    swimming: 8.0,
    yoga: 2.5,
    stretching: 2.3,
    gym: 6.0
};

/**
 * プロフィールから推奨摂取量を計算 (厚労省基準)
 */
function calculateDailyTargets(profile) {
    const { gender, weight, height, age, pal } = profile;
    
    // 基礎代謝 (BMR) - ハリス・ベネディクト改正式
    let bmr;
    if (gender === 'male') {
        bmr = (13.397 * weight) + (4.799 * height) - (5.677 * age) + 88.362;
    } else {
        bmr = (9.247 * weight) + (3.098 * height) - (4.33 * age) + 447.593;
    }
    
    // 1日の総エネルギー消費量 (TDEE)
    // pal: 1.5(低い), 1.75(ふつう), 2.0(高い)
    const tdee = bmr * pal;
    
    return {
        calories: Math.round(tdee),
        p: (tdee * 0.15) / 4, // 15%
        f: (tdee * 0.25) / 9, // 25%
        c: (tdee * 0.60) / 4, // 60%
        salt: gender === 'male' ? 7.5 : 6.5,
        veg: 350,
        gyveg: 120,
        fiber: gender === 'male' ? 21 : 18
    };
}

/**
 * 体重推移シミュレーション (今後30日間)
 * (現在の余剰カロリー平均を元に算出)
 */
function predictWeightTrend(history, activities, profile, days = 30) {
    const currentWeight = parseFloat(profile.weight);
    const bmr = calculateDailyTargets(profile).calories;
    
    // 直近7日間の平均カロリーバランスを取得
    const balance = history.slice(-7).reduce((acc, entry) => {
        return acc + (entry.calories - bmr);
    }, 0) / 7 || 0;
    
    const results = [];
    let projectedWeight = currentWeight;
    
    for (let i = 0; i <= days; i++) {
        // カロリー差分 7200kcalで体重 1kg 増減
        projectedWeight += (balance / 7200);
        results.push({
            day: i,
            weight: parseFloat(projectedWeight.toFixed(2))
        });
    }
    return results;
}
