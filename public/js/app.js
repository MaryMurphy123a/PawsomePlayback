//The URIs of the REST endpoint
const API = {
    RETRIEVE: "https://prod-48.northeurope.logic.azure.com:443/workflows/25f384c85f30456ca8314b9f3752f773/triggers/When_a_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_a_HTTP_request_is_received%2Frun&sv=1.0&sig=Xo6U4KbujTmeuPiWzFd_ExsqKzva0pTjjTlP3Fsw1iA",
    BLOB_ACCOUNT: "https://videoblobstoreb01002332.blob.core.windows.net"
};

// Initialize the application
$(document).ready(function() {
    // Attach event handlers
    $("#retVideos").click(function(){
        getVideos();
    });

    // Search and filter handlers
    $("#searchBox").on("input", filterVideos);
    $("#genreFilter, #ratingFilter").change(filterVideos);

    // Load videos initially
    getVideos();

    // Start polling for video status updates
    startStatusPolling();
});

// Poll for status updates of processing videos
function startStatusPolling() {
    setInterval(function() {
        checkProcessingVideos();
    }, 10000); // Poll every 10 seconds
}

function checkProcessingVideos() {
    const processingVideos = $('.video-processing');
    if (processingVideos.length > 0) {
        processingVideos.each(function() {
            const videoId = $(this).data('video-id');
            checkVideoStatus(videoId);
        });
    }
}

function checkVideoStatus(videoId) {
    $.getJSON(API.RETRIEVE, function(videos) {
        const video = videos.find(v => v.id === videoId);
        if (video && video.status === 'completed') {
            getVideos(); // Refresh the video list
        } else if (video && video.status === 'error') {
            showError(`Processing failed for video ${videoId}`);
        }
    });
}

//A function to get a list of all the assets and write them to the Div with the VideoList Div
function getVideos(){
    //Replace the current HTML in that div with a loading message
    $('#VideoList').html('<div class="d-flex justify-content-center"><div class="spinner-border text-primary" role="status"><span class="sr-only"> &nbsp;</span></div></div>');
    
    $.getJSON(API.RETRIEVE, function( data ) {
        renderVideos(data);
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
                <p class="mt-3 text-muted">No cat videos found. Check back later!</p>
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
                        <p class="text-muted">By ${video["userName"]}</p>
                    </div>
                </div>
            </div>
        `;
        videoGrid.append(videoCard);
    });
}

function filterVideos() {
    const searchTerm = $('#searchBox').val().toLowerCase();
    const selectedGenre = $('#genreFilter').val();
    const selectedRating = $('#ratingFilter').val();

    $('#VideoList').html('<div class="d-flex justify-content-center"><div class="spinner-border text-primary" role="status"><span class="sr-only"> &nbsp;</span></div></div>');

    $.getJSON(API.RETRIEVE, function(videos) {
        const filteredVideos = videos.filter(video => {
            const matchesSearch = video.fileName.toLowerCase().includes(searchTerm) || 
                                (video.description || '').toLowerCase().includes(searchTerm);
            const matchesGenre = !selectedGenre || video.genre === selectedGenre;
            const matchesRating = !selectedRating || video.ageRating === selectedRating;
            return matchesSearch && matchesGenre && matchesRating;
        });

        renderVideos(filteredVideos);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        $('#VideoList').html(`
            <div class="col-12">
                <div class="alert alert-danger" role="alert">
                    <i class="fas fa-exclamation-circle"></i> Error filtering videos: ${textStatus}
                </div>
            </div>
        `);
    });
}

function showError(message) {
    $('.alert').remove();
    const alert = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
            <i class="fas fa-exclamation-circle"></i> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    $('#VideoList').prepend(alert);
}
