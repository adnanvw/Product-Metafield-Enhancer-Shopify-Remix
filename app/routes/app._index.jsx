import { useEffect } from "react";
import { json } from "@remix-run/node";
import { useNavigate, useLoaderData } from "@remix-run/react";
import * as P from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const products = [];
  let hasNextPage = null;
  let nextPageCursor = null;

  await fetchProducts(hasNextPage, nextPageCursor);

  async function fetchProducts(hasNextPage, nextPageCursor) {
    if (hasNextPage == false) return;

    if (hasNextPage == null && nextPageCursor == null) {
      const response = await admin.graphql(
        `query {
          products(first: 10) {
            edges {
              node {
                id
                title
                featuredImage {
                  url
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }`
      );

      const responseJson = await response.json();

      products.push(...responseJson.data.products.edges);
      hasNextPage = responseJson.data.products.pageInfo.hasNextPage;
      nextPageCursor = responseJson.data.products.pageInfo.endCursor;
      await fetchProducts(hasNextPage, nextPageCursor);

    } else if (hasNextPage == true) {
      const response = await admin.graphql(
        `query {
          products(first: 10, after: "${nextPageCursor}") {
            edges {
              node {
                id
                title
                featuredImage {
                  url
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }`
      );

      const responseJson = await response.json();

      products.push(...responseJson.data.products.edges);
      hasNextPage = responseJson.data.products.pageInfo.hasNextPage;
      nextPageCursor = responseJson.data.products.pageInfo.endCursor;

      await fetchProducts(hasNextPage, nextPageCursor);
    }

  }

  return products;
};

export default function Index() {
  const navigate = useNavigate();
  const data = useLoaderData();

  return (
    <P.Page title="Store Products" fullWidth>
      <P.Layout>
        <P.Layout.Section>
          <P.Grid>
            {
              data.map((product, index) =>
                <P.Grid.Cell key={index} columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                  <img width={"80%"} height={"80%"} src={product.node.featuredImage?.url} alt="product_image" />
                  <P.Text variant="headingLg" as="h5">
                    {product.node.title}
                  </P.Text>
                  <P.Button onClick={() => navigate(`/app/product/${product.node.id.replace("gid://shopify/Product/", "")}`)}>Add/Update metafields</P.Button>
                </P.Grid.Cell>
              )
            }
          </P.Grid>
        </P.Layout.Section>
      </P.Layout>
    </P.Page >
  );
}
