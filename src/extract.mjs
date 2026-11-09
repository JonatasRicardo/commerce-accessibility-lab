import * as cheerio from 'cheerio';

const compact = text => text.replace(/\s+/g, ' ').trim();
const resolve = (href, base) => { try { return new URL(href, base).href; } catch { return null; } };

export function extractHtml(html, url) {
  const $ = cheerio.load(html);
  const jsonLd = [];
  $('script[type="application/ld+json"]').each((index, element) => {
    const text = $(element).text();
    try { jsonLd.push({ index, valid: true, value: JSON.parse(text) }); }
    catch (error) { jsonLd.push({ index, valid: false, error: error.message }); }
  });
  const metas = $('meta[name]').toArray().map(el => ({ name: ($(el).attr('name') ?? '').toLowerCase(), content: $(el).attr('content') ?? '' }));
  const images = $('img').toArray();
  const buttons = $('button').toArray();
  const canonicals = $('link[rel~="canonical"]').toArray().map(el => resolve($(el).attr('href'), url)).filter(Boolean);
  const links = $('a[href]').toArray().map(el => ({ url: resolve($(el).attr('href'), url), text: compact($(el).text()).slice(0, 120) }));
  const content = $('body').clone(); content.find('script,style,template,noscript').remove();
  return {
    title: compact($('title').first().text()), lang: $('html').attr('lang') ?? '',
    description: metas.find(m => m.name === 'description')?.content ?? '', metas,
    h1: $('h1').toArray().map(el => compact($(el).text())), canonicals,
    jsonLd, products: collectProducts(jsonLd.filter(x => x.valid).map(x => x.value)),
    images: { total: images.length, withoutAlt: images.filter(el => $(el).attr('alt') === undefined).length, emptyAlt: images.filter(el => $(el).attr('alt') === '').length },
    static: {
      images: images.length, imagesWithoutAlt: images.filter(el => $(el).attr('alt') === undefined).length,
      buttons: buttons.length, buttonsWithExplicitAriaName: buttons.filter(el => $(el).attr('aria-label') || $(el).attr('aria-labelledby')).length,
      ariaHaspopTypo: $('[aria-has' + 'pop]').length,
      jsonLdBlocks: jsonLd.length,
    },
    links: { total: links.length, invalid: links.filter(x => !x.url).length, sample: links.slice(0, 50) },
    textSample: compact(content.text()).slice(0, 2000),
  };
}

export function collectProducts(values) {
  const result = [];
  const seen = new Set();
  function visit(node) {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) { node.forEach(visit); return; }
    const types = [].concat(node['@type'] ?? []).map(t => String(t).split(/[\/#]/).at(-1));
    if (types.includes('Product') || types.includes('ProductGroup')) {
      const offers = [].concat(node.offers ?? []).filter(x => x && typeof x === 'object');
      result.push({ type: types.find(t => t === 'Product' || t === 'ProductGroup'), name: node.name ?? null, sku: node.sku ?? null,
        offers: offers.map(o => ({ price: o.price ?? o.priceSpecification?.price ?? null, priceCurrency: o.priceCurrency ?? o.priceSpecification?.priceCurrency ?? null, availability: o.availability ?? null })) });
    }
    Object.values(node).forEach(visit);
  }
  values.forEach(visit);
  return result;
}

export function indexDirectives(meta = [], header = '') {
  // Scope qualified X-Robots-Tag clauses: a bingbot-only noindex is not a Googlebot directive.
  const general = meta.filter(x => x.name === 'robots').map(x => x.content.toLowerCase());
  const google = meta.filter(x => x.name === 'googlebot').map(x => x.content.toLowerCase());
  const headerParts = String(header).toLowerCase().split(',');
  let scope = '*'; const applicable = [];
  for (const part of headerParts) {
    const match = part.match(/^\s*([a-z0-9_-]+)\s*:\s*(.*)$/);
    if (match && !['max-snippet', 'max-image-preview', 'max-video-preview', 'unavailable_after'].includes(match[1])) {
      scope = match[1]; if (scope === 'googlebot') applicable.push(match[2]);
    } else if (scope === '*' || scope === 'googlebot') applicable.push(part);
  }
  const directives = [...general, ...google, ...applicable].join(',');
  return { noindex: /(?:^|[\s,;])(noindex|none)(?:$|[\s,;])/.test(directives),
    nofollow: /(?:^|[\s,;])(nofollow|none)(?:$|[\s,;])/.test(directives),
    applicableTo: 'Googlebot + generic directives', rawHeader: String(header), rawMeta: meta.filter(x => ['robots', 'googlebot'].includes(x.name)) };
}
