import uuid

import pytest
from httpx import AsyncClient


class TestDocumentCreate:
    """Tests for POST /api/v1/documents"""

    @pytest.mark.asyncio
    async def test_create_with_title(self, client: AsyncClient):
        """Creating a document with a title should succeed."""
        response = await client.post(
            "/api/v1/documents",
            json={"title": "My Document", "content": "Hello world"},
        )

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "My Document"
        assert data["content"] == "Hello world"
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data

    @pytest.mark.asyncio
    async def test_create_with_default_title(self, client: AsyncClient):
        """Creating a document without title should use 'Untitled'."""
        response = await client.post("/api/v1/documents", json={})

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Untitled"
        assert data["content"] == ""

    @pytest.mark.asyncio
    async def test_create_with_content_only(self, client: AsyncClient):
        """Creating a document with content but no title should work."""
        response = await client.post(
            "/api/v1/documents",
            json={"content": "# Markdown content"},
        )

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Untitled"
        assert data["content"] == "# Markdown content"


class TestDocumentGet:
    """Tests for GET /api/v1/documents/{id}"""

    @pytest.mark.asyncio
    async def test_get_existing_document(self, client: AsyncClient):
        """Getting an existing document should return it."""
        # Create a document first
        create_response = await client.post(
            "/api/v1/documents",
            json={"title": "Test Doc", "content": "Test content"},
        )
        doc_id = create_response.json()["id"]

        # Get the document
        response = await client.get(f"/api/v1/documents/{doc_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == doc_id
        assert data["title"] == "Test Doc"
        assert data["content"] == "Test content"

    @pytest.mark.asyncio
    async def test_get_nonexistent_document(self, client: AsyncClient):
        """Getting a nonexistent document should return 404."""
        fake_id = str(uuid.uuid4())
        response = await client.get(f"/api/v1/documents/{fake_id}")

        assert response.status_code == 404
        assert response.json()["detail"] == "Document not found"


class TestDocumentList:
    """Tests for GET /api/v1/documents"""

    @pytest.mark.asyncio
    async def test_list_empty(self, client: AsyncClient):
        """Listing documents when none exist should return empty list."""
        response = await client.get("/api/v1/documents")

        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.asyncio
    async def test_list_populated(self, client: AsyncClient):
        """Listing documents should return all documents."""
        # Create some documents
        await client.post("/api/v1/documents", json={"title": "Doc 1"})
        await client.post("/api/v1/documents", json={"title": "Doc 2"})
        await client.post("/api/v1/documents", json={"title": "Doc 3"})

        response = await client.get("/api/v1/documents")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
        titles = [doc["title"] for doc in data]
        assert "Doc 1" in titles
        assert "Doc 2" in titles
        assert "Doc 3" in titles


class TestDocumentUpdate:
    """Tests for PATCH /api/v1/documents/{id}"""

    @pytest.mark.asyncio
    async def test_update_title(self, client: AsyncClient):
        """Updating document title should succeed."""
        # Create a document
        create_response = await client.post(
            "/api/v1/documents",
            json={"title": "Original Title"},
        )
        doc_id = create_response.json()["id"]

        # Update the title
        response = await client.patch(
            f"/api/v1/documents/{doc_id}",
            json={"title": "New Title"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "New Title"

    @pytest.mark.asyncio
    async def test_update_content(self, client: AsyncClient):
        """Updating document content should succeed."""
        # Create a document
        create_response = await client.post(
            "/api/v1/documents",
            json={"content": "Original content"},
        )
        doc_id = create_response.json()["id"]

        # Update the content
        response = await client.patch(
            f"/api/v1/documents/{doc_id}",
            json={"content": "New content"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["content"] == "New content"

    @pytest.mark.asyncio
    async def test_update_nonexistent(self, client: AsyncClient):
        """Updating a nonexistent document should return 404."""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/documents/{fake_id}",
            json={"title": "Updated"},
        )

        assert response.status_code == 404
        assert response.json()["detail"] == "Document not found"


class TestDocumentDelete:
    """Tests for DELETE /api/v1/documents/{id}"""

    @pytest.mark.asyncio
    async def test_delete_existing(self, client: AsyncClient):
        """Deleting an existing document should succeed."""
        # Create a document
        create_response = await client.post(
            "/api/v1/documents",
            json={"title": "To Delete"},
        )
        doc_id = create_response.json()["id"]

        # Delete the document
        response = await client.delete(f"/api/v1/documents/{doc_id}")

        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_nonexistent(self, client: AsyncClient):
        """Deleting a nonexistent document should return 404."""
        fake_id = str(uuid.uuid4())
        response = await client.delete(f"/api/v1/documents/{fake_id}")

        assert response.status_code == 404
        assert response.json()["detail"] == "Document not found"

    @pytest.mark.asyncio
    async def test_delete_verify_gone(self, client: AsyncClient):
        """After deletion, document should no longer exist."""
        # Create a document
        create_response = await client.post(
            "/api/v1/documents",
            json={"title": "To Delete"},
        )
        doc_id = create_response.json()["id"]

        # Delete the document
        await client.delete(f"/api/v1/documents/{doc_id}")

        # Verify it's gone
        get_response = await client.get(f"/api/v1/documents/{doc_id}")
        assert get_response.status_code == 404
