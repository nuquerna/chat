let currentUser = null;
let token = null;

const register = async () => {

	const user = {
		"name": "Pablo",
		"email": "pablo@test.com",
		"password": "testPass",
		"room_id": 'd7c6a660-8ba1-47c0-8cb2-6ba85f074aa9'
	}

	const response = await fetch('http://104.248.82.179/api/auth/register', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(user)
	});


	if (response.status === 200) {
		data = await response.json().data;

		currentUser = data.user;
		token = data.access_token;
	} else {
		currentUser = null;
		token = null;
	}
}

S4 = () => (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
getGUID = () => (S4() + S4() + "-" + S4() + "-4" + S4().substr(0, 3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();