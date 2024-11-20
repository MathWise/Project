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
                            labels: Array.from({ length: quiz.totalScore + 1 }, (_, i) => i),
                            datasets: [{
                                label: "# of respondents",
                                data: quiz.scoreDistribution,
                                backgroundColor: "rgb(159, 214, 244)"
                            }]
                        },
                        options: {
                            scales: {
                                x: { 
                                    title: { 
                                        display: true, 
                                        text: "Points scored",
                                        color: 'white' // Change x-axis title color to white
                                    },
                                    grid: {
                                        color: 'rgba(255, 255, 255, 0.1)' // Keep grid lines light but white
                                    }
                                },
                                y: { 
                                    title: { 
                                        display: true, 
                                        text: "# of respondents",
                                        color: 'white' // Change y-axis title color to white
                                    },
                                    grid: {
                                        color: 'rgba(255, 255, 255, 0.1)' // Keep grid lines light but white
                                    },
                                    ticks: {
                                        color: 'white' // Change y-axis tick labels color to white
                                    }
                                }
                            },
                            plugins: {
                                legend: {
                                    labels: {
                                        color: 'white' // Change legend text color to white
                                    }
                                }
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
