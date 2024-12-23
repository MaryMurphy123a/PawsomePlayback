//The URIs of the REST endpoint
const API = {
    UPLOAD: "https://prod-37.northeurope.logic.azure.com:443/workflows/483305e884ce47a7baaeff1903f82da5/triggers/When_a_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_a_HTTP_request_is_received%2Frun&sv=1.0&sig=e1Os0VhLlJOfY_y1ao0S-AGbREKjP3_nMYrHqD_qDCw",
    RETRIEVE: "https://prod-48.northeurope.logic.azure.com:443/workflows/25f384c85f30456ca8314b9f3752f773/triggers/When_a_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_a_HTTP_request_is_received%2Frun&sv=1.0&sig=Xo6U4KbujTmeuPiWzFd_ExsqKzva0pTjjTlP3Fsw1iA",
    BLOB_ACCOUNT: "https://videoblobstoreb01002332.blob.core.windows.net"
};

$(document).ready(function() {
    // Check authentication
    checkAuth();
    
    // Attach event handlers
    $("#subNewForm").click(submitNewAsset);
    $("#logoutBtn").click(handleLogout);
    
    // Load user's videos
    getCreatorVideos();
});

function checkAuth() {
    // Check if we have GitHub token in localStorage
    const token = localStorage.getItem('github_token');
    if (!token) {
        // Redirect to login if no token
        window.location.href = '/';
        return;
    }

    // Get user info from GitHub
    fetch('https://api.github.com/user', {
        headers: {
            'Authorization': `token ${token}`
        }
    })
    .then(response => response.json())
    .then(user => {
        $('#creatorName').text(user.login);
    })
    .catch(() => {
        // If token is invalid, redirect to login
        handleLogout();
    });
}

function handleLogout() {
    localStorage.removeItem('github_token');
    window.location.href = '/';
}

function submitNewAsset(){
    if (!validateForm()) return;

    const submitButton = $('#subNewForm');
    const originalText = submitButton.text();
    submitButton.prop('disabled', true);
    submitButton.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...');

    //Create a form data object
    submitData = new FormData();
    
    //Get form variables and append them to the form data object
    submitData.append('FileName', $('#FileName').val());
    submitData.append('userID', localStorage.getItem('github_token'));
    submitData.append('userName', $('#creatorName').text());
    submitData.append('genre', $('#genre').val());
    submitData.append('ageRating', $('#ageRating').val());
    submitData.append('description', $('#description').val());
    
    //Get the file from the form and append it to the form data object
    const fileInput = $("#UpFile")[0];
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        if (!file.type.startsWith('video/')) {
            showError("Please select a valid video file (MP4 or WebM)");
            resetSubmitButton();
            return;
        }
        submitData.append('File', file);
    } else {
        showError("Please select a file to upload");
        resetSubmitButton();
        return;
    }

    $.ajax({
        url: API.UPLOAD,
        data: submitData,
        cache: false,
        enctype: 'multipart/form-data',
        contentType: false,
        processData: false,
        type: 'POST',
        success: function(data){
            // Check if video was queued for processing
            if (data.status === 'queued' || data.status === 'processing') {
                showSuccess("Video uploaded and queued for processing!");
                // Start polling for this specific video
                startVideoStatusPolling(data.videoId);
            } else {
                showSuccess("Video uploaded successfully!");
            }
            clearForm();
            getCreatorVideos();
            resetSubmitButton();
        },
        error: function(xhr, status, error){
            showError("Upload failed: " + error);
            resetSubmitButton();
        }
    });

    function resetSubmitButton() {
        submitButton.prop('disabled', false);
        submitButton.html(originalText);
    }
}

function startVideoStatusPolling(videoId) {
    const pollInterval = setInterval(() => {
        $.getJSON(API.RETRIEVE, function(videos) {
            const video = videos.find(v => v.id === videoId);
            if (video && video.status === 'completed') {
                clearInterval(pollInterval);
                showSuccess("Video processing completed!");
                getCreatorVideos();
            } else if (video && video.status === 'error') {
                clearInterval(pollInterval);
                showError("Video processing failed. Please try uploading again.");
            }
        }).fail(function() {
            clearInterval(pollInterval);
            showError("Failed to check video processing status.");
        });
    }, 5000);

    // Stop polling after 5 minutes
    setTimeout(() => {
        clearInterval(pollInterval);
    }, 300000);
}

function getCreatorVideos(){
    $('#VideoList').html('<div class="d-flex justify-content-center"><div class="spinner-border text-primary" role="status"><span class="sr-only"> &nbsp;</span></div></div>');
    
    $.getJSON(API.RETRIEVE, function(data) {
        // Filter videos to show only those uploaded by the current user
        const creatorVideos = data.filter(video => 
            video.userID === localStorage.getItem('github_token')
        );
        renderVideos(creatorVideos);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        $('#VideoList').html(`
            <div class="col-12">
                <div class="alert alert-danger" role="alert">
                    <i class="fas fa-exclamation-circle"></i> Error loading videos: ${textStatus}
                </div>
            </div>
        `);
    });
}

function renderVideos(videos) {
    const videoGrid = $('#VideoList');
    videoGrid.empty();

    if (videos.length === 0) {
        videoGrid.html(`
            <div class="col-12 text-center">
                <img src="pawsome-playback-logo.png" alt="No videos" style="height: 120px; width: auto; opacity: 0.7;">
                <p class="mt-3 text-muted">You haven't uploaded any cat videos yet!</p>
            </div>
        `);
        return;
    }

    videos.forEach(video => {
        // Check if video is still processing
        const isProcessing = video.status === 'processing' || video.status === 'queued';
        const videoCard = `
            <div class="col-md-4 mb-4">
                <div class="card h-100 ${isProcessing ? 'video-processing' : ''}" ${isProcessing ? 'data-video-id="' + video.id + '"' : ''}>
                    ${isProcessing ? `
                        <div class="card-img-top d-flex align-items-center justify-content-center bg-light" style="height: 200px;">
                            <div class="text-center">
                                <div class="spinner-border text-primary mb-2" role="status"></div>
                                <p class="text-muted">Processing video...</p>
                            </div>
                        </div>
                    ` : `
                        <video class="card-img-top" controls>
                            <source src='${API.BLOB_ACCOUNT}${video["filePath"]}' type='video/mp4'>
                            Your browser does not support the video tag.
                        </video>
                    `}
                    <div class="card-body">
                        <h5 class="card-title">${video["fileName"]}</h5>
                        <p class="card-text">${video["description"] || ''}</p>
                        <div class="metadata mb-2">
                            <span class="badge bg-primary">${video["genre"]}</span>
                            <span class="badge bg-secondary">${video["ageRating"]}</span>
                            ${isProcessing ? '<span class="badge bg-warning">Processing</span>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        videoGrid.append(videoCard);
    });
}

function validateForm() {
    const requiredFields = ['FileName', 'genre', 'ageRating', 'description'];
    for (const field of requiredFields) {
        if (!$(`#${field}`).val()) {
            showError(`Please fill in the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
            return false;
        }
    }
    return true;
}

function showError(message) {
    $('.alert').remove();
    const alert = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
            <i class="fas fa-exclamation-circle"></i> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    $('#uploadForm').prepend(alert);
}

function showSuccess(message) {
    $('.alert').remove();
    const alert = `
        <div class="alert alert-success alert-dismissible fade show" role="alert">
            <i class="fas fa-check-circle"></i> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    $('#uploadForm').prepend(alert);
}

function clearForm() {
    $('#FileName').val('');
    $('#genre').val('');
    $('#ageRating').val('');
    $('#description').val('');
    $('#UpFile').val('');
}
