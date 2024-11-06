document.addEventListener("DOMContentLoaded", function () {
    if (typeof quizAnalytics !== 'undefined') {
        console.log("quizAnalytics data:", quizAnalytics);

        // Process the quizAnalytics data to initialize charts
        quizAnalytics.forEach((quiz) => {
            if (quiz.dataAvailable) {
                const canvasId = `chart-${quiz.quizTitle.replace(/\s+/g, '-')}`;
                const canvasElement = document.getElementById(canvasId);

                // Check if the canvas element exists
                if (canvasElement) {
                    const ctx = canvasElement.getContext("2d");
                    new Chart(ctx, {
                        type: "bar",
                        data: {
                            labels: Array.from({  length: quiz.totalScore + 1 }, (_, i) => i),
                            datasets: [{
                                label: "# of respondents",
                                data: quiz.scoreDistribution,
                                backgroundColor: "rgba(75, 192, 192, 0.6)"
                            }]
                        },
                        options: {
                            scales: {
                                x: { title: { display: true, text: "Points scored" } },
                                y: { title: { display: true, text: "# of respondents" }, beginAtZero: true }
                            }
                        }
                    });
                } else {
                    console.warn(`Canvas element with id "${canvasId}" not found.`);
                }
            }
        });
    } else {
        console.error("quizAnalytics is undefined in dashboard.js");
    }
});
