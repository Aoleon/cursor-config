import { mondayService } from '../server/services/MondayService';

async function testMondayColumns() {
  try {
    // Test with first Monday item ID from database
    const itemId = "18130419465"; // BPH AO from database
    
    console.log(`📡 Récupération Monday item ${itemId}...\n`);
    
    const item = await mondayService.getItem(itemId);
    
    console.log("📋 Item:", item.id, "-", item.name);
    console.log("\n🔍 Recherche des NOUVELLES colonnes corrigées:\n");
    
    // Find NEW corrected columns from config
    const dateMkpcfgja = item.column_values.find((col: any) => col.id === "date_mkpcfgja");
    const date1 = item.column_values.find((col: any) => col.id === "date__1");
    const longTextMkx4zgjd = item.column_values.find((col: any) => col.id === "long_text_mkx4zgjd");
    
    console.log("✅ date_mkpcfgja (dateLivraisonPrevue → 'Date Métrés'):");
    console.log("   Exists:", !!dateMkpcfgja);
    if (dateMkpcfgja) {
      console.log("   Type:", dateMkpcfgja.type);
      console.log("   Text:", dateMkpcfgja.text);
      console.log("   Value:", dateMkpcfgja.value);
    } else {
      console.log("   ❌ Colonne non trouvée");
    }
    
    console.log("\n✅ date__1 (dateOS → 'Date Accord'):");
    console.log("   Exists:", !!date1);
    if (date1) {
      console.log("   Type:", date1.type);
      console.log("   Text:", date1.text);
      console.log("   Value:", date1.value);
    } else {
      console.log("   ❌ Colonne non trouvée");
    }
    
    console.log("\n✅ long_text_mkx4zgjd (cctp → 'Commentaire sélection'):");
    console.log("   Exists:", !!longTextMkx4zgjd);
    if (longTextMkx4zgjd) {
      console.log("   Type:", longTextMkx4zgjd.type);
      console.log("   Text:", longTextMkx4zgjd.text);
      console.log("   Value:", longTextMkx4zgjd.value?.substring(0, 100));
    } else {
      console.log("   ❌ Colonne non trouvée");
    }
    
    // Count total columns with values
    const filledCols = item.column_values.filter((col: any) => col.text || col.value);
    console.log("\n📊 Colonnes avec valeurs:", filledCols.length, "/", item.column_values.length);
    
    // List all date columns
    console.log("\n📅 Toutes les colonnes DATE:");
    item.column_values.forEach((col: any) => {
      if (col.type === 'date') {
        const val = col.text || col.value || "(vide)";
        console.log(`   - ${col.id.padEnd(20)}: ${val}`);
      }
    });
    
    // List all long_text columns
    console.log("\n📝 Toutes les colonnes LONG_TEXT:");
    item.column_values.forEach((col: any) => {
      if (col.type === 'long_text') {
        const val = col.text ? col.text.substring(0, 50) + "..." : "(vide)";
        console.log(`   - ${col.id.padEnd(20)}: ${val}`);
      }
    });
    
  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error(error.stack);
  }
}

testMondayColumns();
