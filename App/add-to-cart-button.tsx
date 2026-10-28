import Image from "next/image";
import { shopifyFetch } from "@/lib/shopify";
import { PRODUCTS_QUERY } from "@/lib/shopify-queries";
import type { Product } from "@/lib/shopify-types";
import { AddToCartButton } from "./add-to-cart-button";

export default async function HomePage() {
  const data = await shopifyFetch<{ products: { nodes: Product[] } }>(
    PRODUCTS_QUERY,
    { first: 12 }
  );

  const products = data.products.nodes;

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem" } }>
      <h1>Products</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "2rem",
        } }
      >
        {products.map((product) => (
          <div key={product.id}>
            {product.featuredImage && (
              <Image
                src={product.featuredImage.url}
                alt={product.featuredImage.altText ?? product.title}
                width={200}
                height={200}
                style={{ objectFit: "cover" } }
              />
            )}
            <h2 style={{ fontSize: "1rem" } }>{product.title}</h2>
            <p>
              ${parseFloat(product.priceRange.minVariantPrice.amount).toFixed(2)}{" "}
              {product.priceRange.minVariantPrice.currencyCode}
            </p>
            {product.variants.nodes.length > 0 && (
              <AddToCartButton
                variantId={product.variants.nodes[0].id}
                availableForSale={product.availableForSale}
              />
            )}
          </div>
        ))}
      </div>
    </main>
  );
