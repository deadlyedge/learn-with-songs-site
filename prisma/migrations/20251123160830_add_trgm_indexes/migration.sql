CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CreateEnum
CREATE TYPE "UpdatePeriod" AS ENUM ('YEARLY', 'HALF_YEAR', 'THREE_MONTHS', 'MONTHLY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Song" (
    "id" TEXT NOT NULL,
    "geniusId" TEXT,
    "geniusPath" TEXT,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "album" TEXT,
    "releaseDate" TIMESTAMP(3),
    "artworkUrl" TEXT,
    "language" TEXT,
    "url" TEXT,
    "details" JSONB,
    "detailsFetchedAt" TIMESTAMP(3),
    "detailsUpdatePeriod" "UpdatePeriod" NOT NULL DEFAULT 'HALF_YEAR',
    "referentsFetchedAt" TIMESTAMP(3),
    "referentsUpdatePeriod" "UpdatePeriod" NOT NULL DEFAULT 'THREE_MONTHS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatePeriod" "UpdatePeriod" NOT NULL DEFAULT 'YEARLY',

    CONSTRAINT "Song_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchCache" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "songs" JSONB NOT NULL,
    "confidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "line" TEXT NOT NULL,
    "lineNumber" INTEGER,
    "result" TEXT NOT NULL,
    "songPath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "mastered" BOOLEAN NOT NULL DEFAULT false,
    "masteredAt" TIMESTAMP(3),
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "reviewAt" TIMESTAMP(3),

    CONSTRAINT "VocabularyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lyric" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "provider" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatePeriod" "UpdatePeriod" NOT NULL DEFAULT 'HALF_YEAR',

    CONSTRAINT "Lyric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referent" (
    "id" TEXT NOT NULL,
    "geniusId" INTEGER NOT NULL,
    "songId" TEXT NOT NULL,
    "fragment" TEXT NOT NULL,
    "content" TEXT,
    "provider" TEXT,
    "classification" TEXT NOT NULL,
    "rangeContent" TEXT,
    "path" TEXT,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferentAnnotation" (
    "id" TEXT NOT NULL,
    "annotationId" INTEGER NOT NULL,
    "referentId" TEXT NOT NULL,
    "body" TEXT,
    "url" TEXT NOT NULL,
    "votesTotal" INTEGER NOT NULL,
    "verified" BOOLEAN NOT NULL,
    "source" TEXT,
    "authors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferentAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SongToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SongToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Song_geniusId_key" ON "Song"("geniusId");

-- CreateIndex
CREATE UNIQUE INDEX "Song_geniusPath_key" ON "Song"("geniusPath");

-- CreateIndex
CREATE INDEX "Song_title_artist_idx" ON "Song"("title", "artist");

-- CreateIndex
CREATE INDEX "Song_artist_idx" ON "Song"("artist");

-- CreateIndex
CREATE INDEX "Song_geniusPath_idx" ON "Song"("geniusPath");

-- CreateIndex
CREATE INDEX "song_title_trgm_idx" ON "Song" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "song_artist_trgm_idx" ON "Song" USING GIN ("artist" gin_trgm_ops);

-- CreateIndex
CREATE UNIQUE INDEX "SearchCache_query_key" ON "SearchCache"("query");

-- CreateIndex
CREATE INDEX "VocabularyEntry_userId_idx" ON "VocabularyEntry"("userId");

-- CreateIndex
CREATE INDEX "VocabularyEntry_songId_idx" ON "VocabularyEntry"("songId");

-- CreateIndex
CREATE UNIQUE INDEX "Lyric_songId_key" ON "Lyric"("songId");

-- CreateIndex
CREATE INDEX "Lyric_songId_idx" ON "Lyric"("songId");

-- CreateIndex
CREATE UNIQUE INDEX "Referent_geniusId_key" ON "Referent"("geniusId");

-- CreateIndex
CREATE INDEX "Referent_songId_idx" ON "Referent"("songId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferentAnnotation_annotationId_key" ON "ReferentAnnotation"("annotationId");

-- CreateIndex
CREATE INDEX "ReferentAnnotation_referentId_idx" ON "ReferentAnnotation"("referentId");

-- CreateIndex
CREATE INDEX "_SongToUser_B_index" ON "_SongToUser"("B");

-- AddForeignKey
ALTER TABLE "VocabularyEntry" ADD CONSTRAINT "VocabularyEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyEntry" ADD CONSTRAINT "VocabularyEntry_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lyric" ADD CONSTRAINT "Lyric_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referent" ADD CONSTRAINT "Referent_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferentAnnotation" ADD CONSTRAINT "ReferentAnnotation_referentId_fkey" FOREIGN KEY ("referentId") REFERENCES "Referent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SongToUser" ADD CONSTRAINT "_SongToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SongToUser" ADD CONSTRAINT "_SongToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
