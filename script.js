// script.js

// Логирование загрузки страницы
console.log('Страница загружена');

// Получаем элементы
const paymentForm = document.getElementById('payment-form');
const amountInput = document.getElementById('amount');
const loader = document.createElement('div');
loader.className = 'loader';
loader.innerHTML = `
  <div class="spinner"></div>
  <p>Перенаправление на страницу оплаты...</p>
`;
paymentForm.appendChild(loader);
loader.style.display = 'none';

// Создаем элемент для сообщения об успехе
const successMessage = document.createElement('div');
successMessage.className = 'success-message';
successMessage.innerHTML = `
  <h2>Оплата прошла успешно!</h2>
  <p>Спасибо за регистрацию на практикум.</p>
  <p>Теперь вы можете перейти в наш закрытый Telegram-канал.</p>
  <a href="#" class="btn" id="telegram-link">Перейти в Telegram</a>
`;
paymentForm.parentNode.insertBefore(successMessage, paymentForm.nextSibling);
successMessage.style.display = 'none';

// Обработчик отправки формы
if (paymentForm) {
  paymentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Форма оплаты отправлена');
    
    const amount = amountInput.value;
    console.log('Введённые данные:', { amount });

    if (!amount || isNaN(amount) || Number(amount) < 1) {
      alert('Пожалуйста, введите корректную сумму.');
      console.log('Ошибка: некорректная сумма');
      return;
    }

    loader.style.display = 'block';
    paymentForm.querySelector('button[type="submit"]').disabled = true;
    
    try {
      const response = await fetch('https://api.annamarinova.online.annamarinova.online/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      
      console.log(response);
      const data = await response.json();
      console.log('Данные ответа:', data);
      
      if (data.confirmationUrl) {
        // Сохраняем paymentId в localStorage для проверки статуса
        localStorage.setItem('paymentId', data.paymentId);
        window.location.href = data.confirmationUrl;
      } else {
        alert('Ошибка при создании платежа: ' + (data.error || 'Неизвестная ошибка'));
        console.log('Ошибка при создании платежа:', data.error);
      }
    } catch (err) {
      alert('Ошибка при отправке запроса: ' + err.message);
      console.error('Ошибка при отправке запроса:', err);
    } finally {
      loader.style.display = 'none';
      paymentForm.querySelector('button[type="submit"]').disabled = false;
    }
  });
} else {
  console.error('Форма оплаты не найдена на странице');
}

// Проверка статуса платежа после возврата с оплаты
window.addEventListener('DOMContentLoaded', async () => {
  const paymentId = localStorage.getItem('paymentId');
  if (paymentId) {
    try {
      const response = await fetch(`https://api.annamarinova.online.annamarinova.online/api/payment/${paymentId}/status`);
      const data = await response.json();
      console.log('Статус платежа:', data);
      
      if (data.status === 'succeeded' || data.status === 'pending') {
        paymentForm.style.display = 'none';
        successMessage.style.display = 'block';
        
        if (data.telegramLink) {
          document.getElementById('telegram-link').href = data.telegramLink;
        }
        
        // Очищаем paymentId, чтобы не показывать успех при следующем визите
        localStorage.removeItem('paymentId');
      }
    } catch (err) {
      console.error('Ошибка при проверке статуса платежа:', err);
    }
  }
});