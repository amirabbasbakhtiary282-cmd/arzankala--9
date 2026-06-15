const axios = require('axios');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';

const POSITIVE_WORDS = [
    'عالی', 'خوب', 'فوق‌العاده', 'بی‌نظیر', 'باکیفیت', 'کیفیت', 'عالی', 'خوبه',
    'مناسب', 'زیبا', 'قوی', 'سریع', 'بادوام', 'شیک', 'ارزش', 'خرید', 'راضی',
    'پیشنهاد', 'بهترین', 'عااالی', 'ممتاز', 'حرفه‌ای', 'خوش‌دست', 'سبک', 'باحال',
    'داغ', 'نو', 'خوشگل', 'کاربردی', 'موثر', 'باکیفیت', 'درجه یک', 'درجه1',
    'خوبی', 'بدون نقص', 'مفید', 'اقتصادی', 'صرفه‌جویی', 'نصبح', 'قابل قبول',
    'خوشحال', 'لذت', 'خرید خوب', 'قیمت مناسب', 'سریع', 'آسان', 'باکیفیت'
];

const NEGATIVE_WORDS = [
    'بد', 'ضعیف', 'بی‌کیفیت', 'گرون', 'گران', 'توصیه نمی‌کنم', 'پشیمون', 'پشیمان',
    'خراب', 'بی‌فایده', 'داغون', 'معیوب', 'کثیف', 'تکراری', 'مسخره', 'مفت نمی‌ارزه',
    'دزدی', 'تقلب', 'تقلب', 'داغون', 'افتضاح', 'شکایت', 'مرجوع', 'مشکل دار',
    'فیک', 'جعلی', 'آسیب دیده', 'دیر', 'خنثی', 'بدرد نمیخوره', 'بی مصرف',
    'پایین', 'بی‌ثبات', 'قطع', 'گرون', 'پول', 'هدر', 'افسوس', 'ناراضی',
    'کاش', 'نمی‌ارزه', 'نمیتونه', 'داغون', 'بی خود', 'هیچی', 'بی‌کیفیت', 'عدم'
];

function keywordSentimentAnalysis(text) {
    const content = text || '';
    let positiveScore = 0;
    let negativeScore = 0;
    const foundPositive = [];
    const foundNegative = [];

    for (const word of POSITIVE_WORDS) {
        if (content.includes(word)) {
            positiveScore++;
            foundPositive.push(word);
        }
    }

    for (const word of NEGATIVE_WORDS) {
        if (content.includes(word)) {
            negativeScore++;
            foundNegative.push(word);
        }
    }

    let sentiment = 'neutral';
    if (positiveScore > negativeScore * 1.5) {
        sentiment = 'positive';
    } else if (negativeScore > positiveScore * 1.5) {
        sentiment = 'negative';
    }

    const summary = sentiment === 'positive'
        ? 'کاربر از این محصول رضایت دارد'
        : sentiment === 'negative'
        ? 'کاربر از این محصول ناراضی است'
        : 'نظر کاربر خنثی است';

    return {
        sentiment,
        positivePoints: foundPositive.slice(0, 5),
        negativePoints: foundNegative.slice(0, 5),
        summary,
        positiveScore,
        negativeScore
    };
}

async function analyzeWithDeepSeek(text) {
    if (!DEEPSEEK_API_KEY) {
        return null;
    }

    try {
        const response = await axios.post(
            'https://api.deepseek.com/v1/chat/completions',
            {
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: 'شما یک تحلیلگر نظرات فارسی هستید. نظر کاربر را تحلیل کرده و به صورت JSON برگردانید: { "sentiment": "positive" or "negative" or "neutral", "positivePoints": ["نقطه قوت 1", "نقطه قوت 2"], "negativePoints": ["نقطه ضعف 1", "نقطه ضعف 2"], "summary": "خلاصه نظر به فارسی" }'
                    },
                    {
                        role: 'user',
                        content: `نظر کاربر: ${text}`
                    }
                ],
                temperature: 0.3,
                max_tokens: 300
            },
            {
                headers: {
                    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );

        const content = response.data.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return null;
    } catch (error) {
        console.error('DeepSeek API error:', error.message);
        return null;
    }
}

async function analyzeComment(text) {
    if (!text || text.trim().length < 3) {
        return {
            sentiment: 'neutral',
            positivePoints: [],
            negativePoints: [],
            summary: 'متن نظر کوتاه است',
            positiveScore: 0,
            negativeScore: 0
        };
    }

    const aiResult = await analyzeWithDeepSeek(text);
    if (aiResult && aiResult.sentiment) {
        return {
            sentiment: aiResult.sentiment,
            positivePoints: aiResult.positivePoints || [],
            negativePoints: aiResult.negativePoints || [],
            summary: aiResult.summary || '',
            analyzedBy: 'deepseek'
        };
    }

    const keywordResult = keywordSentimentAnalysis(text);
    return {
        ...keywordResult,
        analyzedBy: 'keyword'
    };
}

module.exports = { analyzeComment };
