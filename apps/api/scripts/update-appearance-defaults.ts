import { pool } from "../src/db/connection.js";
import "dotenv/config";

async function updateDefaults() {
    console.log("Updating appearance settings defaults for existing surveys...");

    try {
        // Update existing display_settings with old defaults to new defaults
        const result = await pool.query(`
      UPDATE display_settings
      SET
        widget_background_color = COALESCE(NULLIF(widget_background_color, '#333333'), '#141a2c'),
        widget_background_opacity = CASE
          WHEN widget_background_opacity = 0.9 THEN 1.0
          ELSE widget_background_opacity
        END,
        button_background_color = COALESCE(NULLIF(button_background_color, '#292d56'), '#2a44b7')
      WHERE
        widget_background_color = '#333333'
        OR widget_background_opacity = 0.9
        OR button_background_color = '#292d56';
    `);

        console.log(`✓ Updated ${result.rowCount} display_settings records with new defaults`);

        process.exit(0);
    } catch (error) {
        console.error("✗ Failed to update defaults:", error);
        process.exit(1);
    }
}

updateDefaults();
