const axios = require('axios');

async function testSearch() {
    try {
        const response = await axios.get('http://localhost:5000/api/rooms/search');
        console.log('Search results count:', response.data.count);
        console.log('Search results:', JSON.stringify(response.data.rooms, null, 2));
    } catch (error) {
        console.error('Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testSearch();
