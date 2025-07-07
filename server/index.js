// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { YooCheckout } = require('@a2seven/yoo-checkout');

const app = express();
const PORT = process.env.PORT || 4001;

// В реальном проекте используйте базу данных
const paymentsDatabase = {};
const telegramLinksDatabase = {
  'example_payment_id': 'https://t.me/+ITxCgHzKag0xYjBi'
};

// Настройка ЮКассы
const checkout = new YooCheckout({
  shopId: process.env.SHOP_ID,
  secretKey: process.env.SECRET_KEY 
});

// Middleware
app.use(cors());
app.use(express.json());

// Маршрут для создания платежа
app.post('/api/payment', async (req, res) => {
  console.log('POST /api/payment вызван');
  try {
    const { amount } = req.body;
    console.log('Получены данные:', { amount });

    if (!amount || isNaN(amount)) {
      console.log('Ошибка: неверная сумма оплаты');
      return res.status(400).json({ error: 'Неверная сумма оплаты' });
    }

    const createPayload = {
      amount: {
        value: amount,
        currency: 'RUB'
      },
      payment_method_data: {
        type: 'bank_card'
      },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: process.env.RETURN_URL || 'http://127.0.0.1:5501/success.html?paymentId={payment_id}'
      },
      metadata: {
        timestamp: new Date().toISOString()
      }
    };

    const idempotenceKey = Date.now().toString();
    console.log('Отправка запроса в YooCheckout:', createPayload);
    const payment = await checkout.createPayment(createPayload, idempotenceKey);
    console.log('Платёж создан:', payment);

    // Сохраняем платеж в "базе данных"
    paymentsDatabase[payment.id] = payment;
    console.log('Платёж сохранён в базе данных:', payment.id);

    res.json({
      paymentId: payment.id,
      confirmationUrl: payment.confirmation.confirmation_url
    });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ error: error.message || 'Ошибка при создании платежа' });
  }
});

// Маршрут для проверки статуса платежа
app.get('/api/payment/:id/status', (req, res) => {
  const paymentId = req.params.id;
  console.log('GET /api/payment/:id/status вызван для:', paymentId);
  const payment = paymentsDatabase[paymentId];

  if (!payment) {
    console.log('Платёж не найден:', paymentId);
    return res.status(404).json({ error: 'Платеж не найден' });
  }

  // Если статус succeeded или pending, выдаём ссылку на канал
  const showTelegram = payment.status === 'succeeded' || payment.status === 'pending';
  res.json({
    status: payment.status,
    amount: payment.amount,
    telegramLink: showTelegram ? telegramLinksDatabase[paymentId] || telegramLinksDatabase['example_payment_id'] : null
  });
});

// Webhook для уведомлений от ЮКассы
app.post('/api/payment/notifications', async (req, res) => {
  try {
    const paymentId = req.body.object.id;
    const payment = req.body.object;
    console.log('Webhook уведомление получено для платежа:', paymentId, payment.status);
    // Сохраняем обновленный статус платежа
    paymentsDatabase[paymentId] = payment;
    // Здесь можно добавить логику отправки email или другие действия после успешной оплаты
    res.status(200).send();
  } catch (error) {
    console.error('Notification error:', error);
    res.status(500).send();
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});