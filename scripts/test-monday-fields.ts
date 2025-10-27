import mondaySdk from "monday-sdk-js";

const monday = mondaySdk();
monday.setApiVersion("2024-10");
monday.setToken(process.env.MONDAY_API_KEY!);

async function testMondayFields() {
  try {
    // Query Monday.com board 3946257560 for a single item
    const query = `
      query {
        boards(ids: 3946257560) {
          items_page(limit: 1) {
            items {
              id
              name
              column_values {
                id
                text
                value
                type
              }
            }
          }
        }
      }
    `;

    console.log("📡 Interrogation Monday.com board 3946257560...");
    const response: any = await monday.api(query);
    
    const item = response.data.boards[0].items_page.items[0];
    console.log("\n📋 Item Monday:", item.id, "-", item.name);
    console.log("\n🔍 Recherche des colonnes date1, date6, long_text:");
    
    // Find specific columns
    const date1 = item.column_values.find((col: any) => col.id === "date1");
    const date6 = item.column_values.find((col: any) => col.id === "date6");
    const longText = item.column_values.find((col: any) => col.id === "long_text");
    
    console.log("\n✅ date1 (dateLivraisonPrevue):");
    console.log(JSON.stringify(date1, null, 2));
    
    console.log("\n✅ date6 (dateOS):");
    console.log(JSON.stringify(date6, null, 2));
    
    console.log("\n✅ long_text (cctp):");
    console.log(JSON.stringify(longText, null, 2));
    
    // Show all column IDs
    console.log("\n📊 Toutes les colonnes disponibles (" + item.column_values.length + "):");
    item.column_values.forEach((col: any) => {
      if (col.text || col.value) {
        console.log(`  - ${col.id} (${col.type}): ${col.text || JSON.stringify(col.value)?.substring(0, 50)}`);
      }
    });
    
  } catch (error) {
    console.error("❌ Erreur:", error);
  }
}

testMondayFields();
