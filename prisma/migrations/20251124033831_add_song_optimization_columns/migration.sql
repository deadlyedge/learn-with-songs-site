-- AlterTable
ALTER TABLE "Song"
ADD COLUMN "hasDetails" BOOLEAN,
ADD COLUMN "hasLyrics" BOOLEAN,
ADD COLUMN "hasReferents" BOOLEAN;

-- CreateIndex
CREATE INDEX "song_album_trgm_idx" ON "Song" USING GIN ("album" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "song_has_details_idx" ON "Song" (
    "hasDetails",
    "updatedAt" DESC
);

-- 填充现有数据
UPDATE "Song"
SET
    "hasLyrics" = CASE
        WHEN id IN (
            SELECT "songId"
            FROM "Lyric"
        ) THEN TRUE
        ELSE FALSE
    END,
    "hasReferents" = CASE
        WHEN id IN (
            SELECT DISTINCT
                "songId"
            FROM "Referent"
        ) THEN TRUE
        ELSE FALSE
    END;

UPDATE "Song" SET "hasDetails" = ( "hasLyrics" OR "hasReferents" );

-- 创建函数和触发器来保持数据同步

-- Lyric表变化的触发器函数
CREATE OR REPLACE FUNCTION update_song_has_lyrics()
RETURNS TRIGGER AS $$
BEGIN
  -- INSERT 或 UPDATE 时设置hasLyrics为true
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE "Song" SET
      "hasLyrics" = TRUE,
      "hasDetails" = TRUE
    WHERE id = NEW."songId";
    RETURN NEW;

  -- DELETE 时重新计算
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE "Song" SET
      "hasLyrics" = CASE WHEN EXISTS(SELECT 1 FROM "Lyric" WHERE "songId" = OLD."songId") THEN TRUE ELSE FALSE END,
      "hasDetails" = CASE WHEN (
        (EXISTS(SELECT 1 FROM "Lyric" WHERE "songId" = OLD."songId")) OR
        (EXISTS(SELECT 1 FROM "Referent" WHERE "songId" = OLD."songId"))
      ) THEN TRUE ELSE FALSE END
    WHERE id = OLD."songId";
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Referent表变化的触发器函数
CREATE OR REPLACE FUNCTION update_song_has_referents()
RETURNS TRIGGER AS $$
BEGIN
  -- INSERT 或 UPDATE 时设置hasReferents为true
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE "Song" SET
      "hasReferents" = TRUE,
      "hasDetails" = TRUE
    WHERE id = NEW."songId";
    RETURN NEW;

  -- DELETE 时重新计算
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE "Song" SET
      "hasReferents" = CASE WHEN EXISTS(SELECT 1 FROM "Referent" WHERE "songId" = OLD."songId") THEN TRUE ELSE FALSE END,
      "hasDetails" = CASE WHEN (
        (EXISTS(SELECT 1 FROM "Lyric" WHERE "songId" = OLD."songId")) OR
        (EXISTS(SELECT 1 FROM "Referent" WHERE "songId" = OLD."songId"))
      ) THEN TRUE ELSE FALSE END
    WHERE id = OLD."songId";
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER lyric_changes_update_song AFTER INSERT OR UPDATE OR DELETE
ON "Lyric" FOR EACH ROW EXECUTE FUNCTION update_song_has_lyrics();

CREATE TRIGGER referent_changes_update_song AFTER INSERT OR UPDATE OR DELETE
ON "Referent" FOR EACH ROW EXECUTE FUNCTION update_song_has_referents();

-- 验证更新
SELECT
    COUNT(*) as total_songs,
    COUNT(
        CASE
            WHEN "hasLyrics" THEN 1
        END
    ) as songs_with_lyrics,
    COUNT(
        CASE
            WHEN "hasReferents" THEN 1
        END
    ) as songs_with_referents,
    COUNT(
        CASE
            WHEN "hasDetails" THEN 1
        END
    ) as songs_with_details
FROM "Song";