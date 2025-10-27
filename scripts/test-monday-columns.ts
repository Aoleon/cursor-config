import { mondayService } from '../server/services/MondayService';

async function testMondayColumns() {
  try {
    // Test with first Monday item ID from database
    const itemId = "18115615455"; // BPH AO from database
    
    console.log(`📡 Récupération Monday item ${itemId}...\n`);
    
    const item = await mondayService.getItem(itemId);
    
    console.log("📋 Item:", item.id, "-", item.name);
    console.log("\n🔍 Recherche des colonnes date1, date6, long_text:\n");
    
    // Find specific columns
    const date1 = item.column_values.find((col: any) => col.id === "date1");
    const date6 = item.column_values.find((col: any) => col.id === "date6");
    const longText = item.column_values.find((col: any) => col.id === "long_text");
    
    console.log("✅ date1 (dateLivraisonPrevue):");
    console.log("   Exists:", !!date1);
    if (date1) {
      console.log("   Type:", date1.type);
      console.log("   Text:", date1.text);
      console.log("   Value:", date1.value);
    }
    
    console.log("\n✅ date6 (dateOS):");
    console.log("   Exists:", !!date6);
    if (date6) {
      console.log("   Type:", date6.type);
      console.log("   Text:", date6.text);
      console.log("   Value:", date6.value);
    }
    
    console.log("\n✅ long_text (cctp):");
    console.log("   Exists:", !!longText);
    if (longText) {
      console.log("   Type:", longText.type);
      console.log("   Text:", longText.text);
      console.log("   Value:", longText.value?.substring(0, 100));
    }
    
    // Count total columns with values
    const filledCols = item.column_values.filter((col: any) => col.text || col.value);
    console.log("\n📊 Colonnes avec valeurs:", filledCols.length, "/", item.column_values.length);
    
    // List all columns
    console.log("\n📋 Toutes les colonnes disponibles:");
    item.column_values.forEach((col: any) => {
      if (col.text || col.value) {
        const displayValue = col.text || JSON.stringify(col.value)?.substring(0, 50) || "(empty)";
        console.log(`   - ${col.id.padEnd(20)} (${col.type.padEnd(10)}): ${displayValue}`);
      }
    });
    
  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error(error.stack);
  }
}

testMondayColumns();
