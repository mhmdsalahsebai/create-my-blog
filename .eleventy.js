const pluginRss = require("@11ty/eleventy-plugin-rss");
const EleventyFetch = require("@11ty/eleventy-fetch");
const criticalCss = require("eleventy-critical-css");
const eleventyPluginFilesMinifier = require("@sherby/eleventy-plugin-files-minifier");
const Image = require("@11ty/eleventy-img");
const path = require("node:path");

module.exports = (eleventyConfig) => {
  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(criticalCss, {
    css: ["blog/css/reset.css", "blog/css/style.css"],
  });
  eleventyConfig.addPlugin(eleventyPluginFilesMinifier);

  eleventyConfig.addShortcode("image", async (srcFilePath, alt, sizes) => {
    let inputFilePath = path.join(eleventyConfig.dir.input, srcFilePath);

    let metadata = await Image(inputFilePath, {
      widths: [400, 800, 1600],
      formats: ["avif", "webp", "svg", "gif", "jpeg"],
      outputDir: "./_site/optimized/",
      urlPath: "/optimized/",
      svgShortCiruit: "size",
      // svgCompressionSize: "br",
    });

    return Image.generateHTML(metadata, {
      alt,
      sizes,
      loading: "eager",
      decoding: "async",
      fetchpriority: "high",
    });
  });

  eleventyConfig.addShortcode("excerpt", (post) => extractExcerpt(post));

  function extractExcerpt(post) {
    if (!post.templateContent) return "";
    const maxLength = 120;
    const content = post.templateContent;

    const match =
      content.match(/<p>(.*?)<\/p>/) || content.match(/^(.*?[.!?])\s/);
    let excerpt = match ? match[1] : content;

    excerpt = excerpt.replace(/<[^>]+>/g, "").trim();

    if (excerpt.length > maxLength) {
      excerpt = excerpt.substr(0, maxLength).trim();
      excerpt = excerpt.substr(0, excerpt.lastIndexOf(" ")) + "...";
    }

    return excerpt;
  }

  eleventyConfig.addShortcode("readingTime", (input) => {
    let content;
    if (typeof input === "string") {
      content = input;
    } else if (input && input.templateContent) {
      content = input.templateContent;
    } else if (input && input.content) {
      content = input.content;
    } else {
      console.warn("readingTime: Invalid input");
      return 0;
    }

    const wordCount = content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200);
    return readingTime;
  });

  eleventyConfig.addCollection("categories", function (collectionApi) {
    let categories = new Set();
    let posts = collectionApi.getFilteredByTag("post");
    posts.forEach((p) => {
      let cats = p.data.categories;
      cats.forEach((c) => categories.add(c));
    });
    return Array.from(categories);
  });

  eleventyConfig.addFilter("filterByCategory", function (posts, cat) {
    cat = cat && typeof cat === "string" ? cat.toLowerCase() : "";

    let result = posts.filter((p) => {
      let cats = Array.isArray(p.data.categories)
        ? p.data.categories.map((c) =>
            c && typeof c === "string" ? c.toLowerCase() : ""
          )
        : [];
      return cats.includes(cat);
    });

    return result;
  });

  eleventyConfig.addPassthroughCopy("blog/images/*");
  eleventyConfig.addPassthroughCopy("blog/images/favicon/*");
  eleventyConfig.addPassthroughCopy("blog/css/*");
  // eleventyConfig.addPassthroughCopy("blog/fonts/*");
  // eleventyConfig.addPassthroughCopy("blog/fonts/Cairo/*");
  // eleventyConfig.addPassthroughCopy("blog/fonts/Cairo/static/*");

  eleventyConfig.addAsyncShortcode(
    "cacheAsset",
    async function (url, options = {}) {
      try {
        return await EleventyFetch(url, {
          duration: "1d",
          type: "text",
          ...options,
        });
      } catch (e) {
        console.error(`Error fetching ${url}:`, e);
        return "";
      }
    }
  );

  return {
    dir: {
      input: "blog",
    },
  };
};
