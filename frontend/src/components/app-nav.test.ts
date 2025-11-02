import { expect, fixture, html } from '@open-wc/testing';
import { describe, it } from 'vitest';
import type { NavigationConfig } from '../types/data-models';
import './app-nav';
import type { AppNav } from './app-nav';

describe('AppNav', () => {
  it('should render the component', async () => {
    const el = await fixture<AppNav>(html`<app-nav></app-nav>`);

    expect(el).to.exist;
    expect(el.tagName.toLowerCase()).to.equal('app-nav');
  });

  it('should render site title', async () => {
    const el = await fixture<AppNav>(html`<app-nav siteTitle="My Portfolio"></app-nav>`);
    const logo = el.shadowRoot?.querySelector('.logo');

    expect(logo).to.exist;
    expect(logo?.textContent).to.equal('My Portfolio');
  });

  it('should render with default empty title', async () => {
    const el = await fixture<AppNav>(html`<app-nav></app-nav>`);
    const logo = el.shadowRoot?.querySelector('.logo');

    expect(logo).to.exist;
    expect(logo?.textContent).to.equal('');
  });

  it('should render all navigation links when config shows all', async () => {
    const config: NavigationConfig = {
      show_home: true,
      show_albums: true,
    };
    const el = await fixture<AppNav>(html`<app-nav .config=${config}></app-nav>`);
    const links = el.shadowRoot?.querySelectorAll('.nav-links a');

    expect(links).to.have.length(3); // Albums, About, Contact (Home is the logo)
    expect(links?.[0]?.textContent).to.equal('Galleries');
    expect(links?.[1]?.textContent).to.equal('About');
    expect(links?.[2]?.textContent).to.equal('Contact');
  });

  it('should hide navigation links when config shows none', async () => {
    const config: NavigationConfig = {
      show_home: false,
      show_albums: false,
    };
    const el = await fixture<AppNav>(html`<app-nav .config=${config}></app-nav>`);
    const links = el.shadowRoot?.querySelectorAll('.nav-links a');

    expect(links).to.have.length(0);
  });

  it('should render selective navigation links', async () => {
    const config: NavigationConfig = {
      show_home: true,
      show_albums: false,
    };
    const el = await fixture<AppNav>(html`<app-nav .config=${config}></app-nav>`);
    const links = el.shadowRoot?.querySelectorAll('.nav-links a');

    expect(links).to.have.length(1); // Only About (Home is the logo)
    expect(links?.[0]?.textContent).to.equal('About');
  });

  it('should render custom links', async () => {
    const config: NavigationConfig = {
      show_home: true,
      show_albums: false,
    };
    const el = await fixture<AppNav>(html`<app-nav .config=${config}></app-nav>`);
    el.shadowRoot?.querySelectorAll('.nav-links a');
  });

  it('should have correct link hrefs', async () => {
    const config: NavigationConfig = {
      show_home: true,
      show_albums: true,
    };
    const el = await fixture<AppNav>(html`<app-nav .config=${config}></app-nav>`);
    const links = el.shadowRoot?.querySelectorAll('.nav-links a');

    expect(links?.[0]?.getAttribute('href')).to.equal('/albums');
  });

  it('should render logo as link to home', async () => {
    const el = await fixture<AppNav>(html`<app-nav siteTitle="Test"></app-nav>`);
    const logo = el.shadowRoot?.querySelector('.logo');

    expect(logo?.tagName.toLowerCase()).to.equal('a');
    expect(logo?.getAttribute('href')).to.equal('/');
  });

  it('should have nav-links as unordered list', async () => {
    const el = await fixture<AppNav>(html`<app-nav></app-nav>`);
    const navList = el.shadowRoot?.querySelector('.nav-links');

    expect(navList?.tagName.toLowerCase()).to.equal('ul');
  });
});
