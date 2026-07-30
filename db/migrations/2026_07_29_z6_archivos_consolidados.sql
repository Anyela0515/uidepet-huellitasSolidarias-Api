-- =============================================================================
-- Migración: fusiona evidencias_adopcion + archivos_seguimiento + evidencias_denuncia (2026-07-29)
-- =============================================================================
-- Las 3 tablas tenían exactamente el mismo shape (archivo adjunto a un
-- dueño). Se consolidan en `archivos` con 3 FKs opcionales + un CHECK que
-- obliga a que exactamente una esté llena (mantiene integridad referencial
-- real, a diferencia de una FK polimórfica sin constraint).
-- =============================================================================

DROP PROCEDURE IF EXISTS _migrate_2026_07_29_z6_archivos_consolidados;

CREATE PROCEDURE _migrate_2026_07_29_z6_archivos_consolidados()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'archivos'
  ) THEN
    CREATE TABLE archivos (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      solicitud_id VARCHAR(50) NULL,
      seguimiento_id INT UNSIGNED NULL,
      denuncia_id VARCHAR(50) NULL,
      nombre_archivo VARCHAR(255) NOT NULL,
      mime_type VARCHAR(100),
      tamanio_bytes INT UNSIGNED,
      contenido LONGTEXT,
      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_archivo_solicitud FOREIGN KEY (solicitud_id) REFERENCES solicitudes_adopcion(id) ON DELETE CASCADE,
      CONSTRAINT fk_archivo_seguimiento FOREIGN KEY (seguimiento_id) REFERENCES seguimientos_adopcion(id) ON DELETE CASCADE,
      CONSTRAINT fk_archivo_denuncia FOREIGN KEY (denuncia_id) REFERENCES denuncias_rescate(id) ON DELETE CASCADE,
      CONSTRAINT chk_archivo_un_dueno CHECK (
        (solicitud_id IS NOT NULL) + (seguimiento_id IS NOT NULL) + (denuncia_id IS NOT NULL) = 1
      ),
      INDEX idx_archivo_solicitud (solicitud_id),
      INDEX idx_archivo_seguimiento (seguimiento_id),
      INDEX idx_archivo_denuncia (denuncia_id)
    );

    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'evidencias_adopcion') THEN
      INSERT INTO archivos (solicitud_id, nombre_archivo, mime_type, tamanio_bytes, contenido)
        SELECT solicitud_id, nombre_archivo, mime_type, tamanio_bytes, contenido
        FROM evidencias_adopcion;
      DROP TABLE evidencias_adopcion;
    END IF;

    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'archivos_seguimiento') THEN
      INSERT INTO archivos (seguimiento_id, nombre_archivo, mime_type, tamanio_bytes, contenido)
        SELECT seguimiento_id, nombre_archivo, mime_type, tamanio_bytes, contenido
        FROM archivos_seguimiento;
      DROP TABLE archivos_seguimiento;
    END IF;

    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'evidencias_denuncia') THEN
      INSERT INTO archivos (denuncia_id, nombre_archivo, mime_type, tamanio_bytes, contenido)
        SELECT denuncia_id, nombre_archivo, mime_type, tamanio_bytes, contenido
        FROM evidencias_denuncia;
      DROP TABLE evidencias_denuncia;
    END IF;
  END IF;
END;

CALL _migrate_2026_07_29_z6_archivos_consolidados();
DROP PROCEDURE _migrate_2026_07_29_z6_archivos_consolidados;
