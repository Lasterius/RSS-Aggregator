// @ts-check

import _ from 'lodash';

const renderForm = (value, i18n, elements) => {
	const { feedback, inputField } = elements;
	switch (value) {
		case 'valid':
			feedback.classList.add('text-danger');
			feedback.classList.remove('text-success');
			inputField.classList.remove('is-invalid');
			break;
		case 'invalid':
			inputField.classList.add('is-invalid');
			break;
		case 'success':
			feedback.classList.remove('text-danger');
			feedback.classList.add('text-success');
			break;
		default:
			throw new Error(`Unknown formStatus:${value}`);
	}
};

const renderLoadStatus = (state, value, i18n, elements) => {
	const { buttonSubmit, feedback, inputField } = elements;
	switch (value) {
		case 'filling':
			buttonSubmit.disabled = false;
			inputField.disabled = false;
			inputField.focus();
			break;
		case 'processing':
			buttonSubmit.disabled = true;
			inputField.disabled = true;
			feedback.textContent = '';
			break;
		case 'finished':
			inputField.value = '';
			feedback.textContent = i18n.t('successMessage');
			break;
		case 'failed':
			feedback.textContent = i18n.t(`errors.${state.dataLoadState.error}`);
			break;
		default:
			throw new Error(`Unknown dataStatus:${value}`);
	}
};

const createContainer = (element, i18n, dest) => {
	const parentElement = element;
	parentElement.innerHTML = '';
	const container = document.createElement('div');
	container.classList.add('card', 'border-0');
	const containerBody = document.createElement('div');
	containerBody.classList.add('card-body');
	const containerTitle = document.createElement('h2');
	containerTitle.classList.add('card-title', 'h4');
	containerTitle.textContent = i18n.t(`feedForm.${dest}`);
	containerBody.append(containerTitle);
	const containerList = document.createElement('ul');
	containerList.classList.add('list-group', 'border-0', 'rounded-0');
	containerList.id = `${dest}-list`;
	container.append(containerBody);
	container.append(containerList);
	parentElement.append(container);
	return containerList;
};

const renderFeeds = (state, i18n, elements) => {
	const feedsList = createContainer(elements.feedsContainer, i18n, 'feeds');
	state.data.feeds.forEach((feed) => {
		const { title, description } = feed;
		const feedContainer = document.createElement('li');
		feedContainer.classList.add('list-group-item', 'border-0', 'border-end-0');
		const feedTitle = document.createElement('h3');
		feedTitle.classList.add('h6', 'm-0');
		feedTitle.textContent = title;
		const feedDescription = document.createElement('p');
		feedDescription.classList.add('m-0', 'small', 'text-black-50');
		feedDescription.textContent = description;
		feedContainer.append(feedTitle);
		feedContainer.append(feedDescription);
		feedsList.prepend(feedContainer);
	});
};

const renderPosts = (state, i18n, elements) => {
	const postsList = createContainer(elements.postsContainer, i18n, 'posts');
	state.data.posts.forEach((post) => {
		const { title, link, id } = post;
		const postContainer = document.createElement('li');
		postContainer.classList.add(
			'list-group-item',
			'd-flex',
			'justify-content-between'
		);
		postContainer.classList.add(
			'align-items-start',
			'border-0',
			'border-end-0'
		);
		const postDescription = document.createElement('a');
		postDescription.setAttribute('href', link);
		postDescription.setAttribute('target', '_blank');
		postDescription.setAttribute('rel', 'noopener noreferrer');
		const classesForAtag = state.uiState.viewedPostsID.has(id)
			? ['fw-normal', 'link-secondary']
			: ['fw-bold'];
		postDescription.classList.add(...classesForAtag);
		postDescription.setAttribute('data-id', id);
		postDescription.textContent = title;
		const modalButton = document.createElement('button');
		modalButton.setAttribute('type', 'button');
		modalButton.setAttribute('data-id', id);
		modalButton.setAttribute('data-bs-toggle', 'modal');
		modalButton.setAttribute('data-bs-target', '#modal');
		modalButton.classList.add('btn', 'btn-outline-primary', 'btn-sm');
		modalButton.textContent = i18n.t('feedForm.buttonRead');
		postContainer.append(postDescription);
		postContainer.append(modalButton);
		postsList.prepend(postContainer);
	});
};

const renderModal = (state, elements) => {
	const { modalTitle, modalBody, modalLink } = elements;
	const id = state.uiState.activeModalID;
	const { posts } = state.data;
	const { title, link, description } = _.find(posts, (post) => post.id === id);
	modalTitle.textContent = title;
	modalBody.textContent = description;
	modalLink.href = link;
};

export default (state, i18n, changedData, elements) => {
	const { fullPath, value } = changedData;
	const [section, item] = fullPath.split('.');
	switch (section) {
		case 'formState':
			renderForm(value, i18n, elements);
			break;
		case 'dataLoadState':
			if (item === 'status') renderLoadStatus(state, value, i18n, elements);
			break;
		case 'data':
			renderFeeds(state, i18n, elements);
			renderPosts(state, i18n, elements);
			break;
		case 'uiState':
			renderPosts(state, i18n, elements);
			if (item === 'activeModalID') renderModal(state, elements);
			break;
		case 'lng':
			i18n.changeLanguage(value);
			renderForm(state.formState.status, i18n, elements);
			if (state.formState.status === 'invalid') {
				renderLoadStatus(state, 'failed', i18n, elements);
			}
			if (state.formState.status === 'success') {
				renderLoadStatus(state, 'finished', i18n, elements);
			}
			if (state.data.feeds.length > 0) {
				renderPosts(state, i18n, elements);
				renderFeeds(state, i18n, elements);
			}
			break;
		default:
			throw new Error(`Unknown state:${value}`);
	}
};
