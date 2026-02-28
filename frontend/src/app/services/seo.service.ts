import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  constructor(
    private meta: Meta,
    private title: Title
  ) {}

  updateMetaTags(config: {
    title?: string;
    description?: string;
    keywords?: string;
    ogImage?: string;
    ogUrl?: string;
  }) {
    // Set title
    if (config.title) {
      this.title.setTitle(config.title);
    }

    // Set meta tags
    const tags = [
      { name: 'description', content: config.description || 'Free YouTube Video Downloader - Download videos in HD MP4 or convert to MP3' },
      { name: 'keywords', content: config.keywords || 'youtube downloader, video downloader, mp3 converter, youtube to mp4' },
      { name: 'robots', content: 'index, follow' },
      { name: 'author', content: 'YT Media Downloader' },
      
      // Open Graph
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: config.title || 'YouTube Video Downloader' },
      { property: 'og:description', content: config.description || 'Download YouTube videos in HD quality' },
      { property: 'og:image', content: config.ogImage || '/assets/og-image.jpg' },
      { property: 'og:url', content: config.ogUrl || 'https://yourdomain.com' },
      
      // Twitter Card
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: config.title || 'YouTube Video Downloader' },
      { name: 'twitter:description', content: config.description || 'Download YouTube videos easily' },
      { name: 'twitter:image', content: config.ogImage || '/assets/og-image.jpg' }
    ];

    tags.forEach(tag => {
      if ('name' in tag) {
        this.meta.updateTag(tag);
      } else {
        this.meta.updateTag({ property: tag.property, content: tag.content });
      }
    });
  }

  setDefaultTags() {
    this.updateMetaTags({
      title: 'Free YouTube Video Downloader - HD MP4 & MP3 Converter',
      description: 'Download YouTube videos in HD MP4 format or convert to MP3 audio. Fast, free, and easy to use - no registration required.',
      keywords: 'youtube downloader, video downloader, mp3 converter, youtube to mp4, free video download, youtube to mp3',
      ogImage: 'https://yourdomain.com/assets/og-image.jpg',
      ogUrl: 'https://yourdomain.com'
    });
  }

  // JSON-LD Schema
  addStructuredData(type: 'WebApplication' | 'FAQPage', data: any) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    
    const schemaData = {
      '@context': 'https://schema.org',
      '@type': type,
      ...data
    };
    
    script.text = JSON.stringify(schemaData);
    document.head.appendChild(script);
  }

  addWebApplicationSchema() {
    this.addStructuredData('WebApplication', {
      name: 'YouTube Video Downloader',
      description: 'Free online YouTube video and audio downloader',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'All',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD'
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        ratingCount: '1250'
      }
    });
  }
}
