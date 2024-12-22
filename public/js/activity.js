// Function to load activities for a specific activity room
async function loadActivitiesForRoom(activityRoomId) {
    if (!activityRoomId) {
        console.error('No activityRoomId provided to loadActivitiesForRoom.');
        return;
    }
    try {
        console.log('Fetching activities for room ID:', activityRoomId); // Log room ID
        const response = await fetch(`/admin/activities/data/${activityRoomId}`);
        
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
                const isDraftLabels = activity.isDraft ? '<span class="badge badge-warning">Draft</span>' : '';
                const createdAt = new Date(activity.createdAt).toLocaleString();
                const deadline = activity.deadline ? new Date(activity.deadline).toLocaleString() : 'No deadline';
                const activityHtml = `
                <li class="list-group-item d-flex align-items-center" id="activity-item-${activity._id}">
                    <a href="/admin/activity/details/${activity._id}" class="text-decoration-none w-100">
                        <div>
                             <strong>${activity.title}</strong> ${isDraftLabels}
                            <p>${activity.description || 'No description provided'}</p>
                              <p>Created on: ${createdAt}</p>
                            <p>Deadline: ${deadline}</p>
                        </div>
                    </a>
                    <!-- Kebab Menu -->
                    <div class="kebab-menu ml-auto" onclick="event.stopPropagation(); toggleActivityMenu('${activity._id}');">
                        ⋮
                    </div>
                    <!-- Dropdown Menu -->
                    <div class="dropdown-menu activity-menu" id="activity-menu-${activity._id}" style="display: none;">
                        <a href="#" onclick="archiveActivity('${activity._id}'); return false;">Archive</a>
                        <a href="/admin/activity/modify/${activity._id}">Modify</a>
                         <a href="#" onclick="toggleDraftStatus1('${activity._id}'); return false;">
                                ${activity.isDraft ? 'Publish' : 'Make Private'}
                            </a>
                    </div>
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

// Archive an activity
function archiveActivity(activityId) {
    const confirmArchive = confirm('Are you sure you want to archive this activity? This action cannot be undone.');
    if (confirmArchive) {
        fetch(`/admin/archive-activity/${activityId}`, { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                alert(data.message);
                const activityElement = document.getElementById(`activity-item-${activityId}`);
                if (activityElement) {
                    activityElement.remove(); // Remove the activity from the DOM
                }
            })
            .catch(error => console.error('Error archiving activity:', error));
    } else {
        console.log('Archiving canceled.');
    }
}

function toggleDraftStatus1(activityId) {
    const confirmToggles = confirm('Are you sure you want to toggle the visibility of this activity?');
    if (confirmToggles) {
        fetch(`/admin/activity/toggle-draft/${activityId}`, { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                alert(data.message);


    
            // Reload the quiz list dynamically
            const activityRoomId = document.getElementById('activityRoomId').value;
            loadActivitiesForRoom(activityRoomId);
            })
            .catch(error => console.error('Error toggling activity draft status:', error));
    }
}


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
            window.location.href = `/admin/activity/details/${activityId}`;
        }
    });
});
