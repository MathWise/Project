document.addEventListener("DOMContentLoaded", function () {
    const chartInstances = {}; // Track all chart instances by canvas ID

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

                    // Destroy any existing chart instance for this canvas
                    if (chartInstances[canvasId]) {
                        chartInstances[canvasId].destroy();
                    }

                    // Create a new chart and store it in the chartInstances object
                    chartInstances[canvasId] = new Chart(ctx, {
                        type: "bar",
                        data: {
                            labels: Array.from({ length: quiz.totalScore + 1 }, (_, i) => i),
                            datasets: [
                                {
                                    label: "# of respondents",
                                    data: quiz.scoreDistribution,
                                    backgroundColor: "rgb(159, 214, 244)"
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            scales: {
                                x: { 
                                    title: { 
                                        display: true, 
                                        text: "Points scored",
                                        color: 'white' // Change x-axis title color to white
                                    },
                                    ticks: {
                                        color: 'white' // Change x-axis tick labels color to white
                                    },
                                    grid: {
                                        color: 'rgba(255, 255, 255, 0.1)' // X-axis grid line color
                                    }
                                },
                                y: { 
                                    title: { 
                                        display: true, 
                                        text: "# of respondents",
                                        color: 'white' // Change y-axis title color to white
                                    },
                                    ticks: {
                                        color: 'white' // Change y-axis tick labels color to white
                                    },
                                    grid: {
                                        color: 'rgba(255, 255, 255, 0.1)' // Y-axis grid line color
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


function confirmStartQuiz(quizTitle, quizUrl) {
    const confirmed = confirm(`Are you sure you want to start the quiz: "${quizTitle}"? You cannot cancel once you begin.`);
    if (confirmed) {
        // Navigate to the quiz URL if confirmed
        window.location.href = quizUrl;
    }
    // Prevent default action if not confirmed
    return false;
}
