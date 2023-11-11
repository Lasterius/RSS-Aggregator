// @ts-check
export default (data) => {
	const parser = new DOMParser();
	const dom = parser.parseFromString(data, 'application/xml');
	const parseError = dom.querySelector('parsererror');
	if (parseError) {
		throw new Error('invalidRSS');
	}
	const feed = {
		title: dom.querySelector('title').textContent,
		description: dom.querySelector('description').textContent,
	};
	const posts = Array.from(dom.querySelectorAll('item')).map((item) => {
		const title = item.querySelector('title').textContent;
		const link = item.querySelector('link').textContent;
		const description = item.querySelector('description').textContent;
		return { title, link, description };
	});
	return { feed, posts };
};
