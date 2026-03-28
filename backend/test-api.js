// Simple test script to test API endpoints
const http = require('http');

function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api' + path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);
                    resolve(parsed);
                } catch (e) {
                    resolve(responseData);
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function runTests() {
    console.log('Testing API endpoints...\n');
    
    try {
        console.log('1. Testing GET /categories');
        const categories = await makeRequest('GET', '/categories');
        console.log('Response:', JSON.stringify(categories, null, 2));
        console.log('');

        console.log('2. Testing POST /profiles (New Profile)');
        const profileData = {
            name: 'John Doe',
            email: 'john@example.com',
            phone_number: '1234567890',
            position: 'Developer',
            position_type: 'student',
            user_id: 1
        };
        const profileResponse = await makeRequest('POST', '/profiles', profileData);
        console.log('Response:', JSON.stringify(profileResponse, null, 2));
        console.log('');

        console.log('3. Testing POST /categories (New Category - Unique)');
        const categoryData = {
            category_name: 'New Unique Category',
            description: 'A unique category'
        };
        const categoryResponse = await makeRequest('POST', '/categories', categoryData);
        console.log('Response:', JSON.stringify(categoryResponse, null, 2));
        console.log('');

        console.log('4. Testing POST /categories (Duplicate - Should Error)');
        const dupCategoryData = {
            category_name: 'Electronics',
            description: 'Duplicate category'
        };
        const dupResponse = await makeRequest('POST', '/categories', dupCategoryData);
        console.log('Response:', JSON.stringify(dupResponse, null, 2));
        console.log('');

    } catch (err) {
        console.error('Error running tests:', err);
    }
}

// Wait for server to be ready, then run tests
setTimeout(runTests, 1000);
