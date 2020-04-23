const roomId = "8917a86c-2005-4c58-99d2-9e72862adacb";

const room_id = { room_id: roomId };

const errorElement = document.getElementById('signError');

let CURRENT_USER = JSON.parse(sessionStorage.getItem('user')) || {
	name: ''
};

const checkResponse = async (response) => {
	const obj = await response.json();

	if (response.status === 200) {
		sessionStorage.setItem('user', JSON.stringify(obj.data.user));
		sessionStorage.setItem('token', obj.data.access_token);

		if (errorElement) {
			errorElement.innerText = '';
		}

		window.location.href = './chat.html';
	} else {
		if (response.status === 422) {
			if (errorElement) {
				errorElement.innerText = obj.message;
			}
		} else {
			logout();
		}
	}
}

const logout = () => {
	sessionStorage.removeItem('user');
	sessionStorage.removeItem('token');
	window.location.href = './index.html';
}

const getMessages = async () => {
	const response = await fetch(`http://104.248.82.179/api/rooms/${roomId}/messages`, {
		method: 'GET',
		headers: {
			'Authorization': `Bearer ${sessionStorage.getItem('token')}`
		}
	});
	const msgs = await response.json();

	const el = document.getElementById('messages');

	for (const d of msgs.data.reverse()) {
		el.prepend(createMsgElement(d));
	}
}

createMsgElement = (d) => {
	let name = '';
	if (d.user_id === CURRENT_USER.id) {
		name = CURRENT_USER.name;
	}
	const style = name ? 'right' : 'left';
	let div = document.createElement('div');
	div.innerHTML = `<div class="msg ${style}"><div class="${style} title">${name}</div><div class="${style}">${d.text}</div></div>`;
	return div;
}