const timerDisplayElement = document.getElementById('timer-display');

if (timerDisplayElement) {
    const startTime = parseInt(timerDisplayElement.getAttribute('data-start-time'), 10);
    const quizDuration = parseInt(timerDisplayElement.getAttribute('data-timer'), 10) * 60 * 1000;
    const endTime = startTime + quizDuration;

    const timerDisplay = document.getElementById('timer');
    const quizForm = document.getElementById('quizForm');

    function updateTimer() {
        const now = Date.now();
        const remainingTime = endTime - now;

        if (remainingTime <= 0) {
            clearInterval(countdown);
            alert("Time's up! Submitting your quiz automatically.");
            if (quizForm) {
                quizForm.submit();
            } else {
                console.error("Quiz form not found.");
            }
        } else {
            const minutes = Math.floor(remainingTime / 1000 / 60);
            const seconds = Math.floor((remainingTime / 1000) % 60);
            timerDisplay.innerText = `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
        }
    }

    const countdown = setInterval(updateTimer, 1000);
    updateTimer();
} else {
    console.error('Timer or form element is missing.');
}
