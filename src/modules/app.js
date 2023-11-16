// @ts-check

import axios from 'axios';
import i18next from 'i18next';
import onChange from 'on-change';
import * as yup from 'yup';
import resources from '../locales/index.js';
import normalizeData, { getUniquePosts } from './normalizeData.js';
import parse from './parser.js';
import view from './view.js';

const defaultLanguage = 'ru';

const getElements = () => {
  const elements = {
    rssForm: document.querySelector('.rss-form'),
    inputField: document.querySelector('#url-input'),
    buttonSubmit: document.querySelector('.btn-lg'),
    feedback: document.querySelector('.feedback'),
    localeTextElements: document.querySelectorAll('[data-translate]'),
    feedsContainer: document.querySelector('.feeds'),
    postsContainer: document.querySelector('.posts'),
    modalTitle: document.querySelector('.modal-title'),
    modalBody: document.querySelector('.modal-body'),
    modalLink: document.querySelector('.full-article'),
    langChangeButton: document.querySelector('#changeLanguage'),
  };
  return elements;
};

const setLocaleTexts = (elements, i18n) => {
  const { localeTextElements } = elements;
  localeTextElements.forEach((element) => {
    const el = element;
    const elName = el.dataset.translate;
    const dest = elName === 'placeholder_url' ? 'placeholder' : 'textContent';
    el[dest] = i18n.t(`inputForm.${elName}`);
  });
};

const validate = (url, watchedState) => {
  const schema = yup.object().shape({
    url: yup
      .string()
      .url('invalidUrl')
      .notOneOf(
        watchedState.data.feeds.map((feed) => feed.url),
        'alreadyExists'
      )
      .required('emptyField'),
  });
  return schema.validate({ url });
};

const proxify = (url) => {
  const urlWithProxy = new URL('/get', 'https://allorigins.hexlet.app');
  urlWithProxy.searchParams.set('url', url);
  urlWithProxy.searchParams.set('disableCache', 'true');
  return urlWithProxy.toString();
};

const updateRSS = (watchedState) => {
  const callBack = () => {
    const { data } = watchedState;
    const currentPosts = watchedState.data.posts.map((post) => {
      const { title, link, description } = post;
      return { title, link, description };
    });
    const urls = data.feeds.map((feed) => feed.url);
    const feedPromises = urls.map((url) =>
      axios
        .get(proxify(url))
        .catch((err) => console.log('axiosError', err.message))
    );
    const promiseAll = Promise.all(feedPromises);
    promiseAll.then((responses) => {
      responses.forEach((response, index) => {
        try {
          const parsedData = parse(response.data.contents);
          parsedData.feed.url = watchedState.data.feeds[index].id;
          const newPosts = getUniquePosts(parsedData.posts, currentPosts);
          const { posts } = normalizeData({
            feed: parsedData.feed,
            posts: newPosts,
          });
          data.posts = [...posts, ...data.posts];
        } catch (e) {
          console.log('ParsingError');
        }
      });
      setTimeout(callBack, 5000);
    });
  };
  return callBack();
};

const handleSubmitButtonEvent = (watchedState, elements) => {
  const { dataLoadState, formState, data } = watchedState;
  const formData = new FormData(elements.rssForm);
  const inputPath = formData.get('url');
  formState.status = 'valid';
  dataLoadState.status = 'processing';
  validate(inputPath, watchedState)
    .then(({ url }) => axios.get(proxify(url)))
    .then((response) => {
      const { contents } = response.data;
      const parsedData = parse(contents);
      formState.status = 'success';
      dataLoadState.status = 'finished';
      parsedData.feed.url = inputPath;
      const { feed, posts } = normalizeData(parsedData);
      data.feeds = [...data.feeds, feed];
      data.posts = [...data.posts, ...posts];
      dataLoadState.status = 'filling';
    })
    .catch((err) => {
      formState.status = 'invalid';
      const currentError =
        err.name === 'AxiosError' ? 'badNetwork' : err.message;
      dataLoadState.error = currentError;
      dataLoadState.status = 'failed';
      dataLoadState.status = 'filling';
    });
};

const handlePostButtonEvent = (watchedState, elements, e) => {
  const { id } = e.target.dataset ?? null;
  const { uiState } = watchedState;
  if (id) {
    uiState.viewedPostsID.add(id);
  }
  if (e.target instanceof HTMLButtonElement) {
    uiState.activeModalID = id;
  }
};

export default () => {
  const state = {
    lng: defaultLanguage,
    formState: {
      status: 'valid',
    },
    dataLoadState: {
      status: 'filling',
      error: '',
    },
    data: {
      posts: [],
      feeds: [],
    },
    uiState: {
      activeModalID: '',
      viewedPostsID: new Set(),
    },
  };

  const i18n = i18next.createInstance();
  i18n.init({
    lng: state.lng,
    debug: false,
    resources,
  });

  const elements = getElements();
  setLocaleTexts(elements, i18n);

  const watchedState = onChange(state, (path, value) => {
    view(state, i18n, { fullPath: path, value }, elements);
  });
  elements?.rssForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSubmitButtonEvent(watchedState, elements);
  });
  elements?.postsContainer.addEventListener('click', (e) => {
    handlePostButtonEvent(watchedState, elements, e);
  });
  elements?.langChangeButton.addEventListener('change', (e) => {
    const newLanguage = e.target?.defaultValue ?? 'ru';
    watchedState.lng = newLanguage;
    setLocaleTexts(elements, i18n);
  });
  updateRSS(watchedState);
};
