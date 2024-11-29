// Function to load activities for a specific activity room
async function loadActivitiesForRoom(activityRoomId) {
    if (!activityRoomId) {
        console.error('No activityRoomId provided to loadActivitiesForRoom.');
        return;
    }
    try {
        console.log('Fetching activities for room ID:', activityRoomId); // Log room ID
        const response = await fetch(`/user/activities/data/${activityRoomId}`);
        
        if (!response.ok) {
            console.error('Failed to fetch activities:', response.status, response.statusText);
            return;
        }

        const data = await response.json();
        console.log('Activities data:', data); // Log fetched data

        const activityList = document.querySelector('#loadedActivities');
        activityList.innerHTML = ''; // Clear the list

        if (data.activities && data.activities.length > 0) {
          
            data.activities.forEach(activity => {
                const isDraftLabel = activity.isDraft ? '<span class="badge badge-warning">Draft</span>' : '';
                const deadline = activity.deadline ? new Date(activity.deadline).toLocaleString() : 'No deadline';
                const activityHtml = `
                <li class="list-group-item d-flex align-items-center" id="activity-item-${activity._id}">
                    <a href="/user/activity/details/${activity._id}" class="text-decoration-none w-100">
                        <div>

                            <strong>${activity.title}</strong> ${isDraftLabel}
                            <p>${activity.description || 'No description provided'}</p>
                            <p>Deadline: ${deadline}</p>
                        </div>
                    </a>
                    
                </li>`;
                activityList.insertAdjacentHTML('beforeend', activityHtml);
            });
        } else {
            activityList.innerHTML = '<li class="list-group-item">No activities available.</li>';
        }
    } catch (error) {
        console.error('Error fetching activities:', error);
    }
}

// Function to toggle the kebab menu for activities
function toggleActivityMenu(activityId) {
    const menu = document.getElementById(`activity-menu-${activityId}`);
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

// Close all activity kebab menus when clicking outside
document.addEventListener('click', function(event) {
    if (!event.target.closest('.kebab-menu')) {
        document.querySelectorAll('.activity-menu').forEach(menu => (menu.style.display = 'none'));
    }
});



document.querySelectorAll('.clickable').forEach(function (roomElement) {
    roomElement.addEventListener('click', function () {
        const activityRoomId = this.getAttribute('data-room-id');
        const activityType = this.querySelector('strong').textContent.trim();

        console.log('Room clicked, ID:', activityRoomId, 'Type:', activityType);

        
        if (activityType === 'Activity') {
            document.getElementById('quizActivityRoomContent').style.display = 'none';
            document.getElementById('activityRoomContent').style.display = 'block';

            const activityRoomIdInput = document.getElementById('activityRoomId');
            if (activityRoomIdInput) {
                activityRoomIdInput.value = activityRoomId; // Dynamically set the hidden field value
                console.log('Hidden input activityRoomId set to:', activityRoomIdInput.value);
            } else {
                console.error('Hidden input activityRoomId not found in DOM.');
            }

            loadActivitiesForRoom(activityRoomId);
        }
    });
});
document.getElementById('activityForm').addEventListener('submit', function (event) {
    const activityRoomId = document.getElementById('aactivityRoomId').value;

    if (!activityRoomId) {
        event.preventDefault(); // Prevent submission if ID is missing
        alert('No activity room selected. Please select a room first.');
        console.error('Form submission prevented: aactivityRoomId is missing.');
        return;
    }

    console.log('Submitting form with aactivityRoomId:', activityRoomId); // Debug log
});

document.getElementById('submissionFile').addEventListener('change', (event) => {
    const fileInput = event.target;
    const fileName = fileInput.files[0]?.name || 'No file selected';
    document.getElementById('fileLabel').textContent = `Selected: ${fileName}`;
});

// Optional: Allow users to remove selected files
document.getElementById('removeFile').addEventListener('click', () => {
    document.getElementById('submissionFile').value = '';
    document.getElementById('fileLabel').textContent = 'No file selected';
});

document.querySelectorAll('#loadedActivities .list-group-item').forEach((activity) => {
    activity.addEventListener('click', () => {
        const activityId = activity.getAttribute('data-activity-id');
        if (activityId) {
            window.location.href = `/user/activity/details/${activityId}`;
        }
    });
});
