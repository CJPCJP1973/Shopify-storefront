shopify-sandbox-emerald-yacht
Unclaimed Shopify Sandbox
You will be guided to move this resource to your Shopify account.


shopify-sandbox-emerald-yacht
Shopify ID: vercel-store-d1e7fdce-f2cbbuun.myshopify.com

My Integrations

Installation

Shopify


Show Metadata & Quickstart











Framework logo
Getting Started
1

Overview

This guide will walk you through getting a working Next.js app running and connected to this store.

The app you will build will have this structure.

shopify-storefront/
├── .env.local
├── next.config.ts
├── lib/
│   ├── shopify.ts              # API client
│   ├── shopify-types.ts        # TypeScript types
│   ├── shopify-queries.ts      # GraphQL queries & mutations
│   └── cart-actions.ts         # Server Actions for cart
├── app/
│   ├── layout.tsx              # Root layout with nav
│   ├── page.tsx                # Product listing
│   ├── add-to-cart-button.tsx  # Client component
│   └── cart/
│       ├── page.tsx            # Cart page
│       └── cart-line-item.tsx  # Cart line client component
2

Create a Next.js Project

npx create-next-app@latest shopify-storefront
When prompted:

TypeScript: Yes
App Router: Yes
Everything else: your preference
cd shopify-storefront
3

Build the Shopify API Client

Create a utility that handles all GraphQL requests to Shopify's Storefront API.

Create the file lib/shopify.ts:

const domain = process.env.SHOPIFY_STORE_DOMAIN!;
const storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!;
const endpoint = `https://${domain}/api/2025-01/graphql.json`;

type ShopifyResponse<T> = {
  data: T;
  errors?: { message: string }[];
};

export async function shopifyFetch<T>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": storefrontAccessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json: ShopifyResponse<T> = await response.json();

  if (json.errors) {
    throw new Error(json.errors.map((e) => e.message).join("\n"));
  }

  return json.data;
}
This is a thin wrapper around fetch — no SDK required. It sends GraphQL queries to the Storefront API and returns typed data.

4

Define types

Define Types

Create lib/shopify-types.ts to define the shapes of products, variants, and carts:

export type Money = {
  amount: string;
  currencyCode: string;
};

export type ProductVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  price: Money;
  selectedOptions: {
    name: string;
    value: string;
  }[];
};

export type Product = {
  id: string;
  title: string;
  handle: string;
  description: string;
  availableForSale: boolean;
  priceRange: {
    minVariantPrice: Money;
  };
  featuredImage: {
    url: string;
    altText: string | null;
    width: number;
    height: number;
  } | null;
  variants: {
    nodes: ProductVariant[];
  };
};

export type CartLine = {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    price: Money;
    product: {
      title: string;
      handle: string;
    };
    image: {
      url: string;
      altText: string | null;
    } | null;
  };
  cost: {
    totalAmount: Money;
  };
};

export type Cart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: {
    subtotalAmount: Money;
    totalAmount: Money;
  };
  lines: {
    nodes: CartLine[];
  };
};
5

Add product queries

Create lib/shopify-queries.ts with the GraphQL queries for products:

export const PRODUCTS_QUERY = `
  query Products($first: Int!) {
    products(first: $first) {
      nodes {
        id
        title
        handle
        description
        availableForSale
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        featuredImage {
          url
          altText
          width
          height
        }
        variants(first: 10) {
          nodes {
            id
            title
            availableForSale
            price {
              amount
              currencyCode
            }
            selectedOptions {
              name
              value
            }
          }
        }
      }
    }
  }
`;

export const PRODUCT_BY_HANDLE_QUERY = `
  query ProductByHandle($handle: String!) {
    product(handle: $handle) {
      id
      title
      handle
      description
      availableForSale
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      featuredImage {
        url
        altText
        width
        height
      }
      variants(first: 100) {
        nodes {
          id
          title
          availableForSale
          price {
            amount
            currencyCode
          }
          selectedOptions {
            name
            value
          }
        }
      }
    }
  }
`;
6

Add Cart Mutations

Add cart operations to lib/shopify-queries.ts:

const CART_FRAGMENT = `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost {
      subtotalAmount {
        amount
        currencyCode
      }
      totalAmount {
        amount
        currencyCode
      }
    }
    lines(first: 100) {
      nodes {
        id
        quantity
        merchandise {
          ... on ProductVariant {
            id
            title
            price {
              amount
              currencyCode
            }
            product {
              title
              handle
            }
            image {
              url
              altText
            }
          }
        }
        cost {
          totalAmount {
            amount
            currencyCode
          }
        }
      }
    }
  }
`;

export const CREATE_CART_MUTATION = `
  mutation CartCreate {
    cartCreate(input: {}) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
    }
  }
  ${CART_FRAGMENT}
`;

export const ADD_TO_CART_MUTATION = `
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
    }
  }
  ${CART_FRAGMENT}
`;

export const UPDATE_CART_MUTATION = `
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
    }
  }
  ${CART_FRAGMENT}
`;

export const REMOVE_FROM_CART_MUTATION = `
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
    }
  }
  ${CART_FRAGMENT}
`;

export const GET_CART_QUERY = `
  query Cart($cartId: ID!) {
    cart(id: $cartId) {
      ...CartFields
    }
  }
  ${CART_FRAGMENT}
`;
We use a GraphQL fragment so every cart operation returns the same shape — this keeps the client code simple.

7

Create Server Actions for the Cart

Server Actions let you call Shopify mutations directly from client components without building API routes.

Create lib/cart-actions.ts:

"use server";

import { cookies } from "next/headers";
import { shopifyFetch } from "./shopify";
import {
  CREATE_CART_MUTATION,
  ADD_TO_CART_MUTATION,
  UPDATE_CART_MUTATION,
  REMOVE_FROM_CART_MUTATION,
  GET_CART_QUERY,
} from "./shopify-queries";
import type { Cart } from "./shopify-types";

async function getCartId(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get("cartId")?.value;
}

async function setCartId(cartId: string) {
  const cookieStore = await cookies();
  cookieStore.set("cartId", cartId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });
}

export async function getCart(): Promise<Cart | null> {
  const cartId = await getCartId();
  if (!cartId) return null;

  const data = await shopifyFetch<{ cart: Cart | null }>(GET_CART_QUERY, {
    cartId,
  });

  return data.cart;
}

export async function createCart(): Promise<Cart> {
  const data = await shopifyFetch<{ cartCreate: { cart: Cart } }>(
    CREATE_CART_MUTATION
  );

  const cart = data.cartCreate.cart;
  await setCartId(cart.id);
  return cart;
}

export async function addToCart(variantId: string): Promise<Cart> {
  let cartId = await getCartId();

  if (!cartId) {
    const cart = await createCart();
    cartId = cart.id;
  }

  const data = await shopifyFetch<{ cartLinesAdd: { cart: Cart } }>(
    ADD_TO_CART_MUTATION,
    {
      cartId,
      lines: [{ merchandiseId: variantId, quantity: 1 }],
    }
  );

  return data.cartLinesAdd.cart;
}

export async function updateCartLine(
  lineId: string,
  quantity: number
): Promise<Cart> {
  const cartId = await getCartId();
  if (!cartId) throw new Error("No cart found");

  const data = await shopifyFetch<{ cartLinesUpdate: { cart: Cart } }>(
    UPDATE_CART_MUTATION,
    {
      cartId,
      lines: [{ id: lineId, quantity }],
    }
  );

  return data.cartLinesUpdate.cart;
}

export async function removeFromCart(lineId: string): Promise<Cart> {
  const cartId = await getCartId();
  if (!cartId) throw new Error("No cart found");

  const data = await shopifyFetch<{ cartLinesRemove: { cart: Cart } }>(
    REMOVE_FROM_CART_MUTATION,
    {
      cartId,
      lineIds: [lineId],
    }
  );

  return data.cartLinesRemove.cart;
}
The cart ID is stored in an HTTP-only cookie so it persists across page loads. Each action creates a cart automatically if one doesn't exist yet.

8

Display Products on the Home Page

Replace the contents of app/page.tsx:

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
}
This is a Server Component — it fetches products at request time directly from Shopify, with no client-side loading state needed.

9

Create the "Add to Cart" Button

Since buttons need interactivity, this is a Client Component.

Create app/add-to-cart-button.tsx:

"use client";

import { useTransition } from "react";
import { addToCart } from "@/lib/cart-actions";

export function AddToCartButton({
  variantId,
  availableForSale,
}: {
  variantId: string;
  availableForSale: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await addToCart(variantId);
    });
  }

  return (
    <button onClick={handleClick} disabled={!availableForSale || isPending}>
      {!availableForSale
        ? "Sold Out"
        : isPending
          ? "Adding..."
          : "Add to Cart"}
    </button>
  );
}
10

Build the Cart Page

Create app/cart/page.tsx:

import { getCart } from "@/lib/cart-actions";
import { CartLineItem } from "./cart-line-item";
import Link from "next/link";

export default async function CartPage() {
  const cart = await getCart();

  if (!cart || cart.lines.nodes.length === 0) {
    return (
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem" } }>
        <h1>Your Cart</h1>
        <p>Your cart is empty.</p>
        <Link href="/">Continue Shopping</Link>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem" } }>
      <h1>Your Cart</h1>
      <table style={{ width: "100%", borderCollapse: "collapse" } }>
        <thead>
          <tr style={{ borderBottom: "1px solid #ccc", textAlign: "left" } }>
            <th style={{ padding: "0.5rem" } }>Product</th>
            <th style={{ padding: "0.5rem" } }>Price</th>
            <th style={{ padding: "0.5rem" } }>Quantity</th>
            <th style={{ padding: "0.5rem" } }>Total</th>
            <th style={{ padding: "0.5rem" } }></th>
          </tr>
        </thead>
        <tbody>
          {cart.lines.nodes.map((line) => (
            <CartLineItem key={line.id} line={line} />
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: "2rem", textAlign: "right" } }>
        <p>
          <strong>
            Subtotal: $
            {parseFloat(cart.cost.subtotalAmount.amount).toFixed(2)}{" "}
            {cart.cost.subtotalAmount.currencyCode}
          </strong>
        </p>
        <a
          href={cart.checkoutUrl}
          style={{
            display: "inline-block",
            marginTop: "1rem",
            padding: "0.75rem 1.5rem",
            background: "#000",
            color: "#fff",
            textDecoration: "none",
          } }
        >
          Proceed to Checkout
        </a>
      </div>

      <p style={{ marginTop: "1rem" } }>
        <Link href="/">Continue Shopping</Link>
      </p>
    </main>
  );
}
11

Create the Cart Line Item Component

Each cart line needs buttons for updating quantity and removing — those require client-side interactivity.

Create app/cart/cart-line-item.tsx:

"use client";

import { useTransition } from "react";
import { updateCartLine, removeFromCart } from "@/lib/cart-actions";
import type { CartLine } from "@/lib/shopify-types";

export function CartLineItem({ line }: { line: CartLine }) {
  const [isPending, startTransition] = useTransition();

  function handleUpdateQuantity(newQuantity: number) {
    startTransition(async () => {
      if (newQuantity <= 0) {
        await removeFromCart(line.id);
      } else {
        await updateCartLine(line.id, newQuantity);
      }
    });
  }

  function handleRemove() {
    startTransition(async () => {
      await removeFromCart(line.id);
    });
  }

  return (
    <tr style={{ borderBottom: "1px solid #eee", opacity: isPending ? 0.5 : 1 } }>
      <td style=\{{ padding: "0.5rem" } }>
        {line.merchandise.product.title}
        {line.merchandise.title !== "Default Title" && (
          <span style={{ color: "#666" } }> — {line.merchandise.title}</span>
        )}
      </td>
      <td style={{ padding: "0.5rem" } }>
        ${parseFloat(line.merchandise.price.amount).toFixed(2)}
      </td>
      <td style={{ padding: "0.5rem" } }>
        <button
          onClick={() => handleUpdateQuantity(line.quantity - 1)}
          disabled={isPending}
        >
          -
        </button>
        <span style={{ margin: "0 0.5rem" } }>{line.quantity}</span>
        <button
          onClick={() => handleUpdateQuantity(line.quantity + 1)}
          disabled={isPending}
        >
          +
        </button>
      </td>
      <td style={{ padding: "0.5rem" } }>
        ${parseFloat(line.cost.totalAmount.amount).toFixed(2)}
      </td>
      <td style={{ padding: "0.5rem" } }>
        <button onClick={handleRemove} disabled={isPending}>
          Remove
        </button>
      </td>
    </tr>
  );
}
12

Add Navigatioon

Replace app/layout.tsx with a simple layout that includes a cart link:

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shopify Storefront",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 } }>
        <nav
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "1rem 2rem",
            borderBottom: "1px solid #eee",
          } }
        >
          <a href="/" style={{ textDecoration: "none", fontWeight: "bold" } }>
            Store
          </a>
          <a href="/cart" style={{ textDecoration: "none" } }>
            Cart
          </a>
        </nav>
        {children}
      </body>
    </html>
  );
}
