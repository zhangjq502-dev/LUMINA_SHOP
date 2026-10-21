import Link from 'next/link';
import Image from 'next/image';
import styles from './page.module.scss';

const products = [
  { id: 'knit', name: 'The Everyday Knit', category: 'SOFT TEXTURES', price: '¥ 399', image: '/images/knit.jpg', alt: '柔软的米色针织衫', colors: ['#d8cbbb', '#49453f', '#e8e4de'], label: 'BESTSELLER' },
  { id: 'tee', name: 'The Essential Tee', category: 'WARDROBE ESSENTIALS', price: '¥ 169', image: '/images/tee.jpg', alt: '简约白色短袖 T 恤', colors: ['#eeeae4', '#252525', '#8b9188'], label: '' },
  { id: 'bag', name: 'The Everyday Tote', category: 'FINISHING TOUCHES', price: '¥ 599', image: '/images/bag.jpg', alt: '棕色皮革托特包', colors: ['#996343', '#292421'], label: 'NEW' },
];

export default function HomePage() {
  return (
    <main id="top">
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroImage}>
          <Image src="/images/hero.jpg" alt="身穿蓝色外套的女性，新季穿搭灵感" fill sizes="(max-width: 700px) 100vw, 55vw" preload className={styles.portrait} />
          <span className={styles.imageNote}>THE NEW PERSPECTIVE / VOL. 01</span>
        </div>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>THE EVERYDAY COLLECTION</p>
          <h1 id="hero-title">NEW<br/>ARRIVALS<span>.</span></h1>
          <p className={styles.heroDescription}>Less noise. More you.<br/>为日常而设计，让风格自然发生。</p>
          <a href="#featured" className={styles.button}>SHOP THE COLLECTION <span aria-hidden="true">↗</span></a>
          <p className={styles.season}>TIMELESS PIECES. FRESH PERSPECTIVES.</p>
        </div>
      </section>

      <section id="featured" className={styles.featured} aria-labelledby="featured-title">
        <div className={styles.sectionHeading}>
          <div><p className={styles.eyebrow}>CURATED FOR YOU</p><h2 id="featured-title">The everyday edit</h2></div>
          <Link href="/shop" className={styles.collectionNote}>浏览全部商品 ↗</Link>
        </div>
        <div className={styles.productGrid}>
          {products.map((product) => (
            <article key={product.id} className={styles.product}>
              <Link href={`/products/${product.id}`} className={styles.productImage}>
                <Image src={product.image} alt={product.alt} fill sizes="(max-width: 600px) 50vw, 33vw" />
                {product.label && <span className={styles.badge}>{product.label}</span>}
              </Link>
              <p className={styles.category}>{product.category}</p>
              <div className={styles.productLine}><h3>{product.name}</h3><span>{product.price}</span></div>
              <div className={styles.swatches} aria-label="展示可选配色">
                {product.colors.map((color) => <span key={color} style={{ backgroundColor: color }} />)}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="about" className={styles.about} aria-labelledby="about-title">
        <p className={styles.eyebrow}>THE LUMINA PHILOSOPHY</p>
        <h2 id="about-title">Fewer pieces.<br/>Endless possibilities.</h2>
        <p>不必追逐每一种潮流。用舒适的面料、利落的轮廓，<br className={styles.desktopBreak}/>为你的衣橱留下值得反复穿着的选择。</p>
        <a href="#featured" className={styles.textLink}>EXPLORE THE EDIT <span aria-hidden="true">↗</span></a>
      </section>
      <footer id="contact" className={styles.footer}>
        <div className={styles.footerTop}><a href="#top" className={styles.footerLogo}>✳ LUMINA</a><p>Considered essentials. Everyday confidence.</p><span>用简约，定义日常。</span></div>
        <div className={styles.footerBottom}><span>© {new Date().getFullYear()} LUMINA</span><span>DESIGNED FOR EVERY DAY</span><span>静态概念商城 · 商品与价格仅作展示</span></div>
      </footer>
    </main>
  );
}
