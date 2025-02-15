// content.js

// Function to apply filtering based on active keywords
function filterContent() {
    chrome.storage.sync.get(["enabled", "filters"], (result) => {
      // Check if filtering is enabled
      if (result.enabled === false) return;

      // Use default filters if none are set
      const filters = result.filters || { elon: true, trump: true, slammed: true };
      const activeKeywords = Object.keys(filters).filter(keyword => filters[keyword]);
  
      if (activeKeywords.length === 0) return; // Nothing to filter
  
      // Helper to check if the text contains any active keyword (case-insensitive)
      const containsKeyword = (text) => {
        if (!text) return false;
        return activeKeywords.some(keyword =>
          text.toLowerCase().includes(keyword.toLowerCase())
        );
      };
  
      /**
       * Expanded selectors: 
       *  - Start with universal elements like <article>, <section>, 
       *    and common classes like .story, .card, .post, etc.
       *  - Add site-specific wrappers for WSJ, NYT, Axios, NYPost, Reddit.
       *
       * Feel free to expand this list as you encounter more layouts.
       */
      const selectors = [
        // Common / universal - be more specific to avoid catching containers
        "article[class*='story']",
        "div[class*='story']",
        "div[class*='card']",
        
        // WSJ - specific article selectors only
        "div[id='clickable-opinion-card']",
        "div.css-k3sea5-HeadlineTextBlock",
        "div.css-1bx5v3n-HeadlineTextBlock",
        "div.css-19935vf-HeadlineTextBlock",
        "div.css-1qw2665-HeadlineTextBlock",
        "a.css-zyt02e-StyledLink",
        "div.e1tkngxl0",
        "h4.css-fsvegl",
        "div.css-eiqpni",
        "div.css-1ne6gtp",
        "div.css-d3cz9w",
        "div.e1sf124z9",
        "div.css-1epoiqx-SectionHeading",
        "span.css-9e5yff-SectionTitle",
        // Add tab container links
        "div.css-19wm99h-Box-TabContainer:not(.css-19wm99h-Box-TabContainer[data-opinion])",
        // Add new section label selectors
        "div.e1ohym383",
        "h2.e1ohym382",
        "h2.css-1ogxxt7-SectionLabel",
        "div.css-1wuy3bd-StackWrapper",

        // Reddit specific selectors
        "a[data-ks-id^='t3_']",                    // Post links
        "article[data-testid='post-container']",    // Post containers
        "shreddit-post",                           // New Reddit post elements
        "div[data-testid='post']",                 // Post wrappers
        "div[data-click-id='background']",         // Post backgrounds
        "h3[data-click-id='text']",                // Post titles
        "a[data-click-id='body']",                  // Post body links

        // Axios specific selectors - updated
        "article.gtmView[data-cy='content-card']",           // Main article cards
        "div[data-cy='top-table-story']",                    // Table stories
        "a[data-cy='content-card-header']",                  // Article headers
        "a[data-cy='top-table-story-headline']",             // Table headlines
        "header.h6",                                         // Article headers
        "div[data-vars-headline]",                           // Headline containers
        "div.DraftjsBlocks_draftjs__fm3S2",                  // Article content

        // NPR specific selectors
        "div.item-info",
        "div.title",
        "article.story",
        "div[data-story-id]",
        "div.storytitle",
        "h3.title",

        // Twitter/X specific selectors
        "article[data-testid='tweet']",
        "div[data-testid='cellInnerDiv']",
        "div[data-testid='tweetText']",
        "div.css-175oi2r",

        // Bluesky specific selectors
        "div[data-testid='postCard']",
        "div[data-testid='postContent']",
        "article.post-embed",
        "div.post-content",

        // NYT specific selectors
        "article[data-testid='article']",
        "div.css-1cp3ece",
        "div[data-testid='standard-wrapper']",
        "div.story-wrapper",
        "h3.indicate-hover",

        // NY Post specific selectors
        "article.article-loop",
        "div.story__content",
        "div.story-header",
        "article.story"
      ];
  
      // Helper to check if element is an opinion container
      const isOpinionContainer = (element) => {
        const container = element.closest('.css-19wm99h-Box-TabContainer');
        return container && container.getAttribute('data-opinion') === 'true';
      };
  
      // Helper to check if element is a Reddit post
      const isRedditPost = (element) => {
        return element.closest('article[data-testid="post-container"]') || 
               element.closest('shreddit-post') ||
               element.closest('div[data-testid="post"]');
      };
  
      // Helper to check if element is an Axios article
      const isAxiosArticle = (element) => {
        return element.closest('article[data-cy="content-card"]') || 
               element.closest('[data-cy="top-table-story"]');
      };
  
      // Helper functions for each platform
      const isNPRArticle = (element) => {
        return element.closest('article.story') || 
               element.closest('div[data-story-id]');
      };

      const isTwitterPost = (element) => {
        return element.closest('article[data-testid="tweet"]') ||
               element.closest('div[data-testid="cellInnerDiv"]');
      };

      const isBlueskyPost = (element) => {
        return element.closest('div[data-testid="postCard"]') ||
               element.closest('article.post-embed');
      };

      const isNYTArticle = (element) => {
        return element.closest('article[data-testid="article"]') ||
               element.closest('div[data-testid="standard-wrapper"]');
      };

      const isNYPostArticle = (element) => {
        return element.closest('article.article-loop') ||
               element.closest('article.story');
      };
  
      // Mark opinion containers
      document.querySelectorAll('.css-19wm99h-Box-TabContainer').forEach(container => {
        if (container.textContent.toLowerCase().includes('opinion')) {
          container.setAttribute('data-opinion', 'true');
        }
      });
  
      // Create a mutation observer to watch for dynamically added content
      const observer = new MutationObserver((mutations) => {
        mutations.forEach(() => {
          document.querySelectorAll(selectors.join(',')).forEach(container => {
            if (container.dataset.filtered) return;
            
            const textContent = container.innerText || container.textContent;
            if (containsKeyword(textContent) && !isOpinionContainer(container)) {
              // Find the closest container based on platform
              const articleContainer = 
                isAxiosArticle(container) ? container.closest('article[data-cy="content-card"]') || container.closest('[data-cy="top-table-story"]') :
                isRedditPost(container) ? container.closest('article[data-testid="post-container"]') || container.closest('shreddit-post') :
                isNPRArticle(container) ? container.closest('article.story') || container.closest('div[data-story-id]') :
                isTwitterPost(container) ? container.closest('article[data-testid="tweet"]') :
                isBlueskyPost(container) ? container.closest('div[data-testid="postCard"]') :
                isNYTArticle(container) ? container.closest('article[data-testid="article"]') :
                isNYPostArticle(container) ? container.closest('article.article-loop') :
                container;

              // Hide the container and collapse its space
              articleContainer.style.display = "none";
              articleContainer.style.height = "0";
              articleContainer.style.margin = "0";
              articleContainer.style.padding = "0";
              articleContainer.style.border = "none";
              articleContainer.style.backgroundImage = "none";
              articleContainer.querySelectorAll("img").forEach(img => img.remove());
              articleContainer.dataset.filtered = "true";

              // Also hide any parent elements that might be creating space
              let parent = articleContainer.parentElement;
              while (parent && !parent.matches('body')) {
                const children = Array.from(parent.children);
                const visibleChildren = children.filter(child => 
                  child.style.display !== 'none' && 
                  !child.dataset.filtered
                );
                
                if (visibleChildren.length === 0) {
                  parent.style.height = "0";
                  parent.style.margin = "0";
                  parent.style.padding = "0";
                }
                parent = parent.parentElement;
              }
            }
          });
        });
      });
  
      // Start observing the document with the configured parameters
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
      });
  
      // Initial filter
      document.querySelectorAll(selectors.join(',')).forEach(container => {
        if (container.dataset.filtered) return;
        
        const textContent = container.innerText || container.textContent;
        if (containsKeyword(textContent) && !isOpinionContainer(container)) {
          container.style.display = "none";
          container.style.backgroundImage = "none";
          container.querySelectorAll("img").forEach(img => img.remove());
        }
        container.dataset.filtered = "true";
      });
    });
  }
  
  // Run filter on page load if enabled
  chrome.storage.sync.get(["enabled", "filters"], (result) => {
    const enabled = result.enabled ?? true; // Default to enabled
    const filters = result.filters;
    if (enabled && (!filters || Object.values(filters).some(val => val === true))) {
      filterContent();
    }
  });
  
  // Listen for messages from the popup when filters change
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "updateFilters") {
      // For simplicity, reload the page to update the filtered content.
      location.reload();
    }
  });