class SourceService {
  /**
   * @param {import('./source-repository')} sourceRepository
   */
  constructor(sourceRepository) {
    this.sourceRepository = sourceRepository;
  }

  /**
   * Get all sources.
   * @returns {Promise<Object[]>}
   */
  async getSources() {
    return await this.sourceRepository.findAll(true);
  }

  /**
   * Get a single source by ID.
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async getSource(id) {
    return await this.sourceRepository.findById(id);
  }

  /**
   * Create a new source.
   * @param {Object} data - Source fields to insert.
   * @returns {Promise<Object>}
   */
  async createSource(data) {
    return await this.sourceRepository.create(data);
  }

  /**
   * Update an existing source.
   * @param {string} id
   * @param {Object} data - Fields to update.
   * @returns {Promise<Object>}
   */
  async updateSource(id, data) {
    return await this.sourceRepository.update(id, data);
  }

  /**
   * Delete a source by ID.
   * @param {string} id
   * @returns {Promise<void>}
   */
  async deleteSource(id) {
    return await this.sourceRepository.delete(id);
  }
}

module.exports = SourceService;
