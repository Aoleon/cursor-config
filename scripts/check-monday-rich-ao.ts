import { MondayService } from '../server/services/MondayService';

async function checkRichMondayAO() {
  const mondayService = new MondayService();
  
  // Prendre le PREMIER AO du board (au lieu des 5 déjà testés)
  const query = `
    query {
      boards(ids: [3946257560]) {
        items_page(limit: 1, query_params: {order_by: [{column_id: "name", direction: desc}]}) {
          items {
            id
            name
            column_values {
              id
              type
              text
              value
            }
          }
        }
      }
    }
  `;
  
  const result = await mondayService['executeQuery']<any>(query, {});
  const item = result.boards[0].items_page.items[0];
  
  console.log('\n=== PREMIER AO Monday.com ===');
  console.log(`ID: ${item.id}`);
  console.log(`Nom: ${item.name}\n`);
  
  // Filtrer les colonnes NON vides
  const nonEmptyColumns = item.column_values.filter((col: any) => col.text || col.value);
  
  console.log(`Colonnes remplies: ${nonEmptyColumns.length} / ${item.column_values.length}\n`);
  
  // Afficher les 15 premières colonnes remplies
  console.log('=== Échantillon colonnes remplies ===');
  nonEmptyColumns.slice(0, 15).forEach((col: any) => {
    console.log(`- ${col.id} (${col.type}): ${col.text || JSON.stringify(col.value).slice(0, 50)}`);
  });
  
  // Vérifier spécifiquement les nouveaux champs
  console.log('\n=== Nouveaux champs (dropdown) ===');
  const aoCategory = item.column_values.find((c: any) => c.id === 'dropdown_mkx4j6dh');
  const clientRec = item.column_values.find((c: any) => c.id === 'dropdown_mkx4b61f');
  const selComment = item.column_values.find((c: any) => c.id === 'long_text_mkx4s0qw');
  
  console.log(`aoCategory (dropdown_mkx4j6dh): ${aoCategory?.text || 'VIDE'}`);
  console.log(`clientRecurrency (dropdown_mkx4b61f): ${clientRec?.text || 'VIDE'}`);
  console.log(`selectionComment (long_text_mkx4s0qw): ${selComment?.text || 'VIDE'}`);
  
  // Vérifier les champs contacts/dates/montants
  console.log('\n=== Champs contacts/montants/dates ===');
  const montant = item.column_values.find((c: any) => c.id === 'numeric');
  const contactAO = item.column_values.find((c: any) => c.id === 'person');
  const phone = item.column_values.find((c: any) => c.id === 'tel_phone');
  const email = item.column_values.find((c: any) => c.id === 'email');
  const bureauEtudes = item.column_values.find((c: any) => c.id === 'text__1');
  const dateSortieAO = item.column_values.find((c: any) => c.id === 'date4');
  
  console.log(`montantEstime (numeric): ${montant?.text || 'VIDE'}`);
  console.log(`contactAO (person): ${contactAO?.text || 'VIDE'}`);
  console.log(`contactAOPhone (tel_phone): ${phone?.text || 'VIDE'}`);
  console.log(`contactAOEmail (email): ${email?.text || 'VIDE'}`);
  console.log(`bureauEtudes (text__1): ${bureauEtudes?.text || 'VIDE'}`);
  console.log(`dateSortieAO (date4): ${dateSortieAO?.text || 'VIDE'}`);
}

checkRichMondayAO().catch(console.error);
