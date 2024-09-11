document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const airportPairs = urlParams.get('airport_pairs');
    
    if (airportPairs) {
        document.getElementById('airport_pairs').value = airportPairs;
        processAirportPairs(airportPairs);
    }

    document.getElementById('airportForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const airport_pairs = document.getElementById('airport_pairs').value;
        processAirportPairs(airport_pairs);
    });
});

function processAirportPairs(airport_pairs) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = 'Processing...';

    // Validate and clean input format
    const lines = airport_pairs.split(/[\n;]+/)
        .map(line => line.trim().replace(/["']/g, '').toUpperCase())
        .filter(line => line !== '');
    const invalidLines = lines.filter(line => !line.match(/^[A-Z]{3}\s*-\s*[A-Z]{3}$/));
    
    if (invalidLines.length > 0) {
        resultDiv.innerHTML = `
            <p class="text-danger">Invalid input format on the following line(s):</p>
            <ul>
                ${invalidLines.map(line => `<li>${line}</li>`).join('')}
            </ul>
            <p>Please use the format 'ORIGIN-DESTINATION' (e.g., JFK-LAX) for each line.</p>
        `;
        return;
    }
    
    const cleanedPairs = lines.map(line => line.replace(/\s+/g, '')).join('\n');
    
    axios.post('/', {
        input_pairs: cleanedPairs
    }, {
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(function (response) {
        displayResults(response.data);
    })
    .catch(function (error) {
        console.error('Error:', error);
        resultDiv.innerHTML = `<p class="text-danger">An error occurred: ${error.message}</p>`;
    });
};

function displayResults(data) {
    const resultDiv = document.getElementById('result');
    let result = '<div class="card"><div class="card-body">';
    result += '<h2 class="card-title">Results:</h2>';
    
    if (data.length === 1 && data[0].error) {
        result += `<p class="text-danger">${data[0].error}</p>`;
    } else {
        result += '<form id="airportSelectionForm">';
        result += '<div class="table-responsive">';
        result += '<table class="table table-striped table-hover">';
        result += '<thead class="table-light"><tr><th>Route</th><th>Departure</th><th>Arrival</th></tr></thead><tbody>';
        
        data.forEach((item, index) => {
            result += '<tr>';
            result += `<td>${item.route}</td>`;
            result += `<td>${formatAirportInfo(item.departure, 'departure', index)}</td>`;
            result += `<td>${formatAirportInfo(item.arrival, 'arrival', index)}</td>`;
            result += '</tr>';
        });
        
        result += '</tbody></table>';
        result += '</div>';
        result += '<button type="submit" class="btn btn-primary mt-3 w-100">Submit Selected Airports</button>';
        result += '</form>';
    }
    
    result += '</div></div>';
    resultDiv.innerHTML = result;

    if (document.getElementById('airportSelectionForm')) {
        document.getElementById('airportSelectionForm').addEventListener('submit', handleAirportSelection);
    }
}

function formatAirportInfo(info, type, index) {
    console.log('Formatting airport info:', info, type, index);
    if (!info) {
        return '<span class="text-danger">No information available</span>';
    }

    if (info.error) {
        return `<span class="text-danger">${info.error}</span>`;
    }

    let result = `<strong>${info.code}</strong><br>`;
    if (info.type === 'Metro') {
        result += `${info.city}, ${info.country}<br>`;
        result += `Type: ${info.type}<br>`;
        result += '<strong>Airports:</strong><br>';
        result += '<table class="table table-sm table-bordered">';
        result += '<thead><tr><th>Select</th><th>Code</th><th>Name</th><th>City</th><th>Country</th></tr></thead><tbody>';
        info.airports.forEach(airport => {
            result += `<tr>
                <td><input type="radio" name="${type}_${index}" value="${airport.code}" required></td>
                <td>${airport.code}</td>
                <td>${airport.name}</td>
                <td>${airport.city}</td>
                <td>${airport.country}</td>
            </tr>`;
        });
        result += '</tbody></table>';
    } else {
        result += `${info.name}<br>`;
        result += `${info.city}, ${info.country}<br>`;
        result += `Type: ${info.type}`;
    }
    return result;
}

function handleAirportSelection(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    let selectedPairs = [];

    // Get the original input pairs
    const originalPairs = document.getElementById('airport_pairs').value.split(/[\n;]+/)
        .map(line => line.trim().replace(/["']/g, '').toUpperCase())
        .filter(line => line !== '');

    for (let i = 0; i < originalPairs.length; i++) {
        const [originalDeparture, originalArrival] = originalPairs[i].split(/\s*-\s*/);
        const departureName = `departure_${i}`;
        const arrivalName = `arrival_${i}`;

        let departureCode = formData.get(departureName);
        let arrivalCode = formData.get(arrivalName);

        // If departure wasn't selected (not a metro code), use the original
        if (!departureCode) {
            departureCode = originalDeparture;
        }

        // If arrival wasn't selected (not a metro code), use the original
        if (!arrivalCode) {
            arrivalCode = originalArrival;
        }

        console.log('Selected codes:', departureCode, arrivalCode);
        if (departureCode && arrivalCode) {
            selectedPairs.push(`${departureCode}-${arrivalCode}`);
        }
    }

    console.log('Selected pairs:', selectedPairs);
    const selectedPairsString = selectedPairs.join('\n');
    document.getElementById('airport_pairs').value = selectedPairsString;
    processAirportPairs(selectedPairsString);
}