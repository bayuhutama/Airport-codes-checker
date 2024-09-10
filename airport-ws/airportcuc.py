from flask import Flask, render_template, request, jsonify
import openpyxl
import traceback

app = Flask(__name__)

# Load the Excel file
workbook = openpyxl.load_workbook('C:/document/airport_data.xlsx')
sheet = workbook.active

# Create a dictionary to store airport data
airport_data = {}

# Populate the airport_data dictionary
for row in sheet.iter_rows(min_row=2, values_only=True):
    if row and all(row[:5]):  # Ensure all required fields are present
        region, metro_code, metro_area, airport_code, airport_name = row[:5]
        airport_code = airport_code.strip().upper()
        metro_code = metro_code.strip().upper()
        airport_data[airport_code] = {
            'region': region,
            'metro_code': metro_code,
            'metro_area': metro_area,
            'name': airport_name,
            'type': 'Airport'
        }
        # Add an entry for the metro code as well
        if metro_code not in airport_data:
            airport_data[metro_code] = {
                'region': region,
                'metro_code': metro_code,
                'metro_area': metro_area,
                'name': metro_area,
                'type': 'Metro'
            }

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        try:
            data = request.get_json()
            if not data or 'input_pairs' not in data:
                return jsonify({"error": "Missing 'input_pairs' in request data"}), 400
            
            input_pairs = data['input_pairs'].strip().split('\n')
            results = []

            for pair in input_pairs:
                pair = pair.strip().upper()
                parts = pair.split('-')
                if len(parts) != 2:
                    results.append({
                        "route": pair,
                        "error": "Invalid input format. Use 'ORIGIN-DESTINATION'."
                    })
                else:
                    origin, destination = parts
                    result = {
                        "route": pair,
                        "departure": get_airport_info(origin),
                        "arrival": get_airport_info(destination)
                    }
                    results.append(result)

            return jsonify(results)
        except Exception as e:
            print(traceback.format_exc())
            return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

    return render_template('index.html')  # Only render index.html for GET requests

def get_airport_info(code):
    if code in airport_data:
        info = airport_data[code]
        if info['type'] == 'Metro':
            # If it's a metro code, return all airports in that metro area
            airports = [
                {
                    "code": airport_code,
                    "name": airport_info['name'],
                    "city": airport_info['metro_area'],
                    "country": airport_info['region'],
                    "type": "Airport"
                }
                for airport_code, airport_info in airport_data.items()
                if airport_info['metro_code'] == code and airport_info['type'] == 'Airport'
            ]
            return {
                "code": code,
                "city": info['metro_area'],
                "country": info['region'],
                "type": "Metro",
                "airports": airports
            }
        else:
            # If it's an airport code, return the single airport info
            return {
                "code": code,
                "name": info['name'],
                "city": info['metro_area'],
                "country": info['region'],
                "type": info['type']
            }
    else:
        return {"error": f"Code '{code}' not found.", "code": code}

if __name__ == '__main__':
    app.run(debug=True)